import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { fetchWeekPresence, isOwnerAbsent } from '../lib/presence.js'

const router = Router()

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
  `)
}

// GET /api/bookings/my — current user's bookings (active first, then history)
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    await expireStaleBookings()

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.status,
        b.booked_at,
        b.expires_at,
        b.ended_at,
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
router.post('/', requireAuth, async (req, res, next) => {
  try {
    await expireStaleBookings()

    const { spot_id, expires_at } = req.body as {
      spot_id?: string
      expires_at?: string
    }
    if (!spot_id) {
      res.status(400).json({ error: 'spot_id is required' })
      return
    }

    // Resolve expires_at: use client-supplied value or fall back to 8 h from now
    const expiresAt = expires_at ? new Date(expires_at) : new Date(Date.now() + 8 * 3_600_000)
    if (isNaN(expiresAt.getTime())) {
      res.status(400).json({ error: 'Invalid expires_at' })
      return
    }

    // Auto-cancel any existing active booking for this user before creating a new one
    const existing = await pool.query(
      `SELECT b.id, b.spot_id FROM bookings b WHERE b.user_id = $1 AND b.status = 'active'`,
      [req.user!.userId],
    )
    if (existing.rows.length > 0) {
      const old = existing.rows[0] as { id: string; spot_id: string }
      const cancelClient = await pool.connect()
      try {
        await cancelClient.query('BEGIN')
        await cancelClient.query(
          `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
          [old.id],
        )
        await cancelClient.query(
          `UPDATE spots SET status = 'free' WHERE id = $1`,
          [old.spot_id],
        )
        await cancelClient.query('COMMIT')
      } catch (err) {
        await cancelClient.query('ROLLBACK')
        throw err
      } finally {
        cancelClient.release()
      }
    }

    // Spot must be free (either in DB, or effectively free because owner is absent today)
    const spotResult = await pool.query(
      `SELECT s.id, s.status, o.name AS owner_name
       FROM spots s
       LEFT JOIN owners o ON s.owner_id = o.id
       WHERE s.id = $1`,
      [spot_id],
    )
    if (spotResult.rows.length === 0) {
      res.status(404).json({ error: 'Spot not found' })
      return
    }

    const spotRow = spotResult.rows[0] as {
      id: string
      status: string
      owner_name: string | null
    }
    let isBookable = spotRow.status === 'free'

    if (!isBookable && spotRow.status === 'occupied' && spotRow.owner_name) {
      const today = new Date().toISOString().slice(0, 10)
      const presence = await fetchWeekPresence(today)
      isBookable = isOwnerAbsent(presence, spotRow.owner_name, today)
    }

    if (!isBookable) {
      res.status(409).json({ error: 'Spot is not available for booking' })
      return
    }

    // Create booking + reserve spot in a transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`UPDATE spots SET status = 'reserved' WHERE id = $1`, [
        spot_id,
      ])
      const booking = await client.query(
        `INSERT INTO bookings (user_id, spot_id, expires_at, reserved_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, booked_at, expires_at, ended_at`,
        [req.user!.userId, spot_id, expiresAt.toISOString(), req.user!.displayName],
      )
      await client.query('COMMIT')

      const b = booking.rows[0]
      const spotInfo = await pool.query(
        'SELECT number, label, floor FROM spots WHERE id = $1',
        [spot_id],
      )
      const s = spotInfo.rows[0]
      res.status(201).json({
        ...b,
        spot_id,
        spot_number: s.number,
        spot_label: s.label,
        spot_floor: s.floor,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    next(err)
  }
})

// PATCH /api/bookings/:id/cancel — cancel an active booking
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params

    const bookingResult = await pool.query(
      `SELECT id, user_id, spot_id, status FROM bookings WHERE id = $1`,
      [id],
    )
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ error: 'Booking not found' })
      return
    }
    const booking = bookingResult.rows[0]

    if (booking.user_id !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not your booking' })
      return
    }
    if (booking.status !== 'active') {
      res.status(409).json({ error: 'Booking is already cancelled or expired' })
      return
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
        [id],
      )
      await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
        booking.spot_id,
      ])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
