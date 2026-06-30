import { Router } from 'express'

import { pool } from '../db/pool.js'
import { ACEX_OWNER_NAME } from '../lib/acexOwners.js'
import { broadcast } from '../lib/broadcast.js'
import { ljubljanaDate } from '../lib/localDate.js'
import { pushChatMessage } from '../lib/rocketchatNotify.js'
import { fetchWeekPresence, isOwnerAbsent } from '../lib/presence.js'
import { requireAuth, requireNonGuest } from '../middleware/auth.js'

const router = Router()

// Mirror of the frontend isCurrentUserOwner check. A user counts as a co-owner
// if either signal matches: their SSO username appears in the admin-linked
// comma-separated owner.user_id, OR their displayName matches a name segment in
// owner.name ("Name1 / Name2 / ..."). The displayName fallback is necessary
// because owner.user_id is admin-populated and often incomplete for shared spots.
function isUserCoOwner(
  ownerUserId: string | null,
  ownerName: string | null,
  username: string,
  displayName: string,
): boolean {
  const usernameMatch =
    !!ownerUserId &&
    ownerUserId
      .split(',')
      .map((u) => u.trim())
      .includes(username)
  const displayNameMatch =
    !!ownerName &&
    ownerName
      .split('/')
      .map((n) => n.trim().toLowerCase())
      .includes(displayName.toLowerCase())
  return usernameMatch || displayNameMatch
}

export async function freeOrphanedReservedSpots(): Promise<void> {
  const result = await pool.query(`
    UPDATE spots
    SET status = 'free'
    WHERE status = 'reserved'
      AND id NOT IN (SELECT spot_id FROM bookings WHERE status = 'active')
  `)
  if (result.rowCount && result.rowCount > 0) {
    console.log(`[startup] Freed ${result.rowCount} orphaned reserved spot(s)`)
  }
}

async function expireStaleBookings(): Promise<void> {
  await pool.query(`
    WITH expired AS (
      UPDATE bookings
      SET status = 'expired', ended_at = now()
      WHERE status = 'active' AND expires_at < now()
      RETURNING spot_id
    )
    UPDATE spots
    SET status = 'free'
    WHERE id IN (SELECT spot_id FROM expired)
      AND id NOT IN (SELECT spot_id FROM bookings WHERE status = 'active')
  `)
}

// GET /api/bookings/my — current user's bookings (active first, then history)
router.get('/my', requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    await expireStaleBookings()

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.status,
        b.booked_at,
        b.starts_at,
        b.expires_at,
        to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
        b.ended_at,
        b.cancelled_by,
        s.id AS spot_id,
        s.number AS spot_number,
        s.label AS spot_label,
        s.floor AS spot_floor
      FROM bookings b
      JOIN spots s ON b.spot_id = s.id
      WHERE b.user_id = $1
      ORDER BY b.booked_at DESC
    `,
      [req.user!.userId],
    )

    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// POST /api/bookings — book a free spot
router.post('/', requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    await expireStaleBookings()

    const { spot_id, starts_at, expires_at } = req.body as {
      spot_id?: string
      starts_at?: string
      expires_at?: string
    }
    if (!spot_id) {
      res.status(400).json({ error: 'spot_id is required' })
      return
    }

    // Resolve expires_at: use client-supplied value or fall back to 8 h from now
    const expiresAt = expires_at
      ? new Date(expires_at)
      : new Date(Date.now() + 8 * 3_600_000)
    if (Number.isNaN(expiresAt.getTime())) {
      res.status(400).json({ error: 'Invalid expires_at' })
      return
    }

    const startsAt = starts_at ? new Date(starts_at) : null
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      res.status(400).json({ error: 'Invalid starts_at' })
      return
    }

    // The day this booking belongs to is the LOCAL (Slovenian) calendar day of
    // its start — NOT the UTC date of expires_at, which rolls to the next day for
    // a late/long booking and previously let two users book the same spot/day.
    const targetDate = ljubljanaDate(startsAt ?? expiresAt)

    // Pre-fetch owner presence outside the transaction (external HTTP call)
    // to avoid holding the lock during a network request.
    let presenceData: Awaited<ReturnType<typeof fetchWeekPresence>> | null =
      null
    try {
      presenceData = await fetchWeekPresence(targetDate)
    } catch {
      // Presence API failure should not block booking — treat as unavailable
    }

    // Single transaction: auto-cancel old booking + check availability + create new booking
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Lock the target spot row to prevent concurrent bookings
      const spotResult = await client.query(
        `SELECT s.id, s.status, s.number, s.label, s.floor,
                o.name AS owner_name, o.user_id AS owner_user_id
         FROM spots s
         LEFT JOIN owners o ON s.owner_id = o.id
         WHERE s.id = $1
         FOR UPDATE OF s`,
        [spot_id],
      )
      if (spotResult.rows.length === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({ error: 'Spot not found' })
        return
      }

      const spotRow = spotResult.rows[0] as {
        id: string
        status: string
        number: number
        label: string | null
        floor: number
        owner_name: string | null
        owner_user_id: string | null
      }

      // Co-owner status drives both the bookability gate (owners can book their
      // own spot regardless of presence) and the booked_by_owner flag (used to
      // prevent other co-owners from cancelling this booking).
      const bookedByOwner = isUserCoOwner(
        spotRow.owner_user_id,
        spotRow.owner_name,
        req.user!.username,
        req.user!.displayName,
      )

      // Auto-cancel existing active booking for this user on the same day
      const existing = await client.query(
        `SELECT b.id, b.spot_id FROM bookings b
         WHERE b.user_id = $1 AND b.status = 'active'
           AND b.booking_date = $2::date
         FOR UPDATE`,
        [req.user!.userId, targetDate],
      )
      if (existing.rows.length > 0) {
        const old = existing.rows[0] as { id: string; spot_id: string }
        await client.query(
          `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
          [old.id],
        )
        // Only free the old spot if no other active bookings remain for it
        const otherActive = await client.query(
          `SELECT id FROM bookings WHERE spot_id = $1 AND status = 'active' AND id != $2 LIMIT 1`,
          [old.spot_id, old.id],
        )
        if (otherActive.rows.length === 0) {
          await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
            old.spot_id,
          ])
        }
      }

      // Check for active booking conflict on the target date
      const conflict = await client.query(
        `SELECT id FROM bookings
         WHERE spot_id = $1 AND status = 'active' AND booking_date = $2::date`,
        [spot_id, targetDate],
      )
      if (conflict.rows.length > 0) {
        await client.query('ROLLBACK')
        console.log(
          `[booking] 409 CONFLICT: spot ${spotRow.number} already has active booking on ${targetDate}`,
        )
        res.status(409).json({ error: 'Spot is not available for booking' })
        return
      }

      // Check per-day override (spot_day_status) — owner's explicit decision
      const overrideResult = await client.query(
        `SELECT status FROM spot_day_status WHERE spot_id = $1 AND date = $2::date`,
        [spot_id, targetDate],
      )
      let isBookable: boolean
      if (overrideResult.rows.length > 0) {
        // Owner override is authoritative
        isBookable = overrideResult.rows[0].status === 'free'
      } else if (spotRow.owner_name === ACEX_OWNER_NAME) {
        // Public pool spots are bookable by default. An admin takes one out of
        // circulation by setting status 'occupied' — the only way a pool spot
        // becomes 'occupied', since bookings only ever set 'reserved'. That
        // blocks new bookings; 'free'/'reserved' stay bookable and real
        // same-day conflicts are already rejected by the conflict check above.
        isBookable = spotRow.status !== 'occupied'
      } else if (spotRow.status === 'occupied' && spotRow.owner_name) {
        // Co-owners can always book their own spot, regardless of presence —
        // clicking Reserve on an unconfirmed shared spot resolves the ambiguity
        // into a concrete booking under this co-owner's name.
        if (bookedByOwner) {
          isBookable = true
        } else {
          // Non-owner trying to book a shared spot — fall back to presence.
          // Support shared spots: owner_name may be "Name1 / Name2 / Name3".
          // Bookable only when ALL co-owners are absent (same logic as the frontend).
          const ownerNames = spotRow.owner_name
            .split('/')
            .map((n: string) => n.trim())
            .filter(Boolean)
          isBookable =
            presenceData !== null &&
            ownerNames.length > 0 &&
            ownerNames.every((name: string) =>
              isOwnerAbsent(presenceData, name, targetDate),
            )
        }
      } else {
        // No override — use spot's base status.
        // 'reserved' with no active-booking conflict (already checked above) is bookable.
        isBookable = spotRow.status === 'free' || spotRow.status === 'reserved'
      }

      if (!isBookable) {
        await client.query('ROLLBACK')
        console.log(
          `[booking] 409 NOT BOOKABLE: spot ${spotRow.number}, status=${spotRow.status}, owner=${spotRow.owner_name}, targetDate=${targetDate}, presenceData=${presenceData ? 'loaded' : 'null'}`,
        )
        res.status(409).json({ error: 'Spot is not available for booking' })
        return
      }

      // Booking on a spot supersedes any user-reported "spotted" flag — clear it.
      await client.query(
        `UPDATE spot_spotted_reports
         SET cleared_at = now(), cleared_by = $2
         WHERE spot_id = $1 AND cleared_at IS NULL`,
        [spot_id, req.user!.username],
      )

      // Create booking + reserve spot
      await client.query(`UPDATE spots SET status = 'reserved' WHERE id = $1`, [
        spot_id,
      ])
      const booking = await client.query(
        `INSERT INTO bookings (user_id, spot_id, starts_at, expires_at, booking_date, reserved_by, booked_by_owner)
         VALUES ($1, $2, $3, $4, $5::date, $6, $7)
         RETURNING id, status, booked_at, starts_at, expires_at,
                   to_char(booking_date, 'YYYY-MM-DD') AS booking_date, ended_at`,
        [
          req.user!.userId,
          spot_id,
          startsAt ? startsAt.toISOString() : null,
          expiresAt.toISOString(),
          targetDate,
          req.user!.displayName,
          bookedByOwner,
        ],
      )
      await client.query('COMMIT')

      const b = booking.rows[0]
      broadcast()
      res.status(201).json({
        ...b,
        spot_id,
        spot_number: spotRow.number,
        spot_label: spotRow.label,
        spot_floor: spotRow.floor,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    // Unique-index violation on (spot_id, booking_date) WHERE active — a
    // concurrent booking won the race for this spot/day. Surface as a clean 409
    // rather than a 500. This is the DB-level guarantee behind the conflict check.
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: string }).code === '23505'
    ) {
      res.status(409).json({ error: 'Spot is not available for booking' })
      return
    }
    next(err)
  }
})

// PATCH /api/bookings/:id/times — update reservation interval
router.patch(
  '/:id/times',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { starts_at, expires_at } = req.body as {
        starts_at?: string
        expires_at?: string
      }
      if (!starts_at && !expires_at) {
        res.status(400).json({
          error: 'At least one of starts_at or expires_at is required',
        })
        return
      }

      const newStartsAt = starts_at ? new Date(starts_at) : null
      const newExpiresAt = expires_at ? new Date(expires_at) : null

      if (newStartsAt && Number.isNaN(newStartsAt.getTime())) {
        res.status(400).json({ error: 'Invalid starts_at' })
        return
      }
      if (newExpiresAt && Number.isNaN(newExpiresAt.getTime())) {
        res.status(400).json({ error: 'Invalid expires_at' })
        return
      }

      // Lock-then-update in a single transaction to prevent lost updates
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const bookingResult = await client.query(
          `SELECT id, user_id, spot_id, status, starts_at, expires_at FROM bookings WHERE id = $1 FOR UPDATE`,
          [id],
        )
        if (bookingResult.rows.length === 0) {
          await client.query('ROLLBACK')
          res.status(404).json({ error: 'Booking not found' })
          return
        }
        const booking = bookingResult.rows[0]

        if (
          booking.user_id !== req.user!.userId &&
          req.user!.role !== 'admin'
        ) {
          await client.query('ROLLBACK')
          res.status(403).json({ error: 'Not your booking' })
          return
        }
        if (booking.status !== 'active') {
          await client.query('ROLLBACK')
          res.status(409).json({ error: 'Booking is not active' })
          return
        }

        // Keep booking_date in sync with the new interval — derive it from the
        // local (Slovenian) day of starts_at (preferred) so the day a booking
        // belongs to always tracks its start, even if the end time crosses midnight.
        const result = await client.query(
          `UPDATE bookings
         SET starts_at  = COALESCE($1, starts_at),
             expires_at = COALESCE($2, expires_at),
             booking_date = (
               COALESCE($1::timestamptz, starts_at, $2::timestamptz, expires_at)
               AT TIME ZONE 'Europe/Ljubljana'
             )::date
         WHERE id = $3
         RETURNING id, status, booked_at, starts_at, expires_at,
                   to_char(booking_date, 'YYYY-MM-DD') AS booking_date, ended_at`,
          [
            newStartsAt ? newStartsAt.toISOString() : null,
            newExpiresAt ? newExpiresAt.toISOString() : null,
            id,
          ],
        )
        await client.query('COMMIT')

        broadcast()
        res.json(result.rows[0])
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      // Moving an interval onto a day the spot is already booked trips the
      // one-active-booking-per-spot-per-day index — report it as a conflict.
      if (
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        res.status(409).json({ error: 'Spot is not available for booking' })
        return
      }
      next(err)
    }
  },
)

// PATCH /api/bookings/:id/cancel — cancel an active booking
// Allowed by: booking owner, admin, or spot owner
router.patch(
  '/:id/cancel',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const { id } = req.params

      // Set when someone OTHER than the booking owner cancels — used to notify
      // the bumped user after the transaction commits.
      let notifId: string | null = null
      let notifBody = ''
      let notifUserId = ''

      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Lock the booking row to prevent concurrent cancel/modify
        const bookingResult = await client.query(
          `SELECT b.id, b.user_id, b.spot_id, b.status, b.booked_by_owner,
                b.expires_at,
                s.label  AS spot_label,
                s.number AS spot_number,
                o.user_id AS spot_owner_username,
                o.name    AS spot_owner_name
         FROM bookings b
         JOIN spots s ON s.id = b.spot_id
         LEFT JOIN owners o ON o.id = s.owner_id
         WHERE b.id = $1
         FOR UPDATE OF b`,
          [id],
        )
        if (bookingResult.rows.length === 0) {
          await client.query('ROLLBACK')
          res.status(404).json({ error: 'Booking not found' })
          return
        }
        const booking = bookingResult.rows[0]

        const isBookingOwner = booking.user_id === req.user!.userId
        const isAdmin = req.user!.role === 'admin'
        // Match the booking-creation co-owner check: accept either user_id
        // linkage or a displayName match against owner.name segments.
        const isSpotOwner = isUserCoOwner(
          booking.spot_owner_username as string | null,
          booking.spot_owner_name as string | null,
          req.user!.username,
          req.user!.displayName,
        )

        // Spot owners may cancel squatter bookings, but never another co-owner's booking.
        const canCancel =
          isBookingOwner || isAdmin || (isSpotOwner && !booking.booked_by_owner)
        if (!canCancel) {
          await client.query('ROLLBACK')
          res.status(403).json({ error: 'Not your booking' })
          return
        }
        if (booking.status !== 'active') {
          await client.query('ROLLBACK')
          res
            .status(409)
            .json({ error: 'Booking is already cancelled or expired' })
          return
        }

        // Record who cancelled: null = self, otherwise the canceller's display name
        const cancelledBy = isBookingOwner ? null : req.user!.displayName

        await client.query(
          `UPDATE bookings SET status = 'cancelled', ended_at = now(), cancelled_by = $2 WHERE id = $1`,
          [id, cancelledBy],
        )
        // Only free the spot if this was its last active booking
        const remaining = await client.query(
          `SELECT id FROM bookings WHERE spot_id = $1 AND status = 'active' AND id != $2 LIMIT 1`,
          [booking.spot_id, id],
        )
        if (remaining.rows.length === 0) {
          await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
            booking.spot_id,
          ])
        }

        // If someone other than the booking owner cancelled (spot owner reclaiming,
        // or an admin), record a notification for the bumped user.
        if (!isBookingOwner) {
          const label = booking.spot_label ?? `#${booking.spot_number}`
          const dateStr = booking.expires_at
            ? String(booking.expires_at).slice(0, 10)
            : ''
          notifBody = `Your reservation for ${label}${dateStr ? ` on ${dateStr}` : ''} was cancelled because the spot owner reclaimed it.`
          notifUserId = booking.user_id
          const notif = await client.query(
            `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'reservation_released', $2, $3, $4)
           RETURNING id`,
            [
              booking.user_id,
              'Reservation released',
              notifBody,
              JSON.stringify({
                spot_id: booking.spot_id,
                booking_id: id,
                spot_label: label,
                date: dateStr,
              }),
            ],
          )
          notifId = notif.rows[0].id as string
        }

        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }

      // Best-effort proactive DM after commit — failure must not affect the
      // response (the cancel is already committed). Swallow any delivery error.
      if (notifId) {
        try {
          const ok = await pushChatMessage(notifUserId, `⚠️ ${notifBody}`)
          if (ok) {
            await pool.query(
              `UPDATE notifications SET pushed_at = now() WHERE id = $1`,
              [notifId],
            )
          }
        } catch (err) {
          console.error(
            '[bookings] post-cancel notification delivery failed:',
            err instanceof Error ? err.message : String(err),
          )
        }
      }

      broadcast()
      res.json({ ok: true, notified: notifId !== null })
    } catch (err) {
      next(err)
    }
  },
)

export default router
