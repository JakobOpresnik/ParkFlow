import { Router } from "express";

import { pool } from "../db/pool.js";
import { fetchWeekPresence, isOwnerAbsent } from "../lib/presence.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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
  `);
}

// GET /api/bookings/my — current user's bookings (active first, then history)
router.get("/my", requireAuth, async (req, res, next) => {
  try {
    await expireStaleBookings();

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.status,
        b.booked_at,
        b.expires_at,
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
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings — book a free spot
router.post("/", requireAuth, async (req, res, next) => {
  try {
    await expireStaleBookings();

    const { spot_id, starts_at, expires_at } = req.body as {
      spot_id?: string;
      starts_at?: string;
      expires_at?: string;
    };
    if (!spot_id) {
      res.status(400).json({ error: "spot_id is required" });
      return;
    }

    // Resolve expires_at: use client-supplied value or fall back to 8 h from now
    const expiresAt = expires_at
      ? new Date(expires_at)
      : new Date(Date.now() + 8 * 3_600_000);
    if (isNaN(expiresAt.getTime())) {
      res.status(400).json({ error: "Invalid expires_at" });
      return;
    }

    // Pre-fetch owner presence outside the transaction (external HTTP call)
    // to avoid holding the lock during a network request.
    const targetDate = expiresAt.toISOString().slice(0, 10);
    let presenceData: Awaited<ReturnType<typeof fetchWeekPresence>> | null =
      null;
    try {
      presenceData = await fetchWeekPresence(targetDate);
    } catch {
      // Presence API failure should not block booking — treat as unavailable
    }

    // Single transaction: auto-cancel old booking + check availability + create new booking
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock the target spot row to prevent concurrent bookings
      const spotResult = await client.query(
        `SELECT s.id, s.status, s.number, s.label, s.floor, o.name AS owner_name
         FROM spots s
         LEFT JOIN owners o ON s.owner_id = o.id
         WHERE s.id = $1
         FOR UPDATE OF s`,
        [spot_id],
      );
      if (spotResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Spot not found" });
        return;
      }

      const spotRow = spotResult.rows[0] as {
        id: string;
        status: string;
        number: number;
        label: string | null;
        floor: number;
        owner_name: string | null;
      };

      // Auto-cancel existing active booking for this user on the same day
      const existing = await client.query(
        `SELECT b.id, b.spot_id FROM bookings b
         WHERE b.user_id = $1 AND b.status = 'active'
           AND b.expires_at::date = $2::date
         FOR UPDATE`,
        [req.user!.userId, expiresAt.toISOString()],
      );
      if (existing.rows.length > 0) {
        const old = existing.rows[0] as { id: string; spot_id: string };
        await client.query(
          `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
          [old.id],
        );
        // Only free the old spot if no other active bookings remain for it
        const otherActive = await client.query(
          `SELECT id FROM bookings WHERE spot_id = $1 AND status = 'active' AND id != $2 LIMIT 1`,
          [old.spot_id, old.id],
        );
        if (otherActive.rows.length === 0) {
          await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
            old.spot_id,
          ]);
        }
      }

      // Check for active booking conflict on the target date
      const conflict = await client.query(
        `SELECT id FROM bookings
         WHERE spot_id = $1 AND status = 'active' AND expires_at::date = $2::date`,
        [spot_id, expiresAt.toISOString()],
      );
      if (conflict.rows.length > 0) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Spot is not available for booking" });
        return;
      }

      // Check per-day override (spot_day_status) — owner's explicit decision
      const overrideResult = await client.query(
        `SELECT status FROM spot_day_status WHERE spot_id = $1 AND date = $2::date`,
        [spot_id, targetDate],
      );
      let isBookable: boolean;
      if (overrideResult.rows.length > 0) {
        // Owner override is authoritative
        isBookable = overrideResult.rows[0].status === "free";
      } else if (spotRow.status === "occupied" && spotRow.owner_name) {
        // No override — fall back to presence/timesheet
        isBookable =
          presenceData !== null &&
          isOwnerAbsent(presenceData, spotRow.owner_name, targetDate);
      } else {
        // No override — use spot's base status.
        // 'reserved' with no active-booking conflict (already checked above) is bookable.
        isBookable =
          spotRow.status === "free" || spotRow.status === "reserved";
      }

      if (!isBookable) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Spot is not available for booking" });
        return;
      }

      // Create booking + reserve spot
      await client.query(`UPDATE spots SET status = 'reserved' WHERE id = $1`, [
        spot_id,
      ]);
      const startsAt = starts_at ? new Date(starts_at) : null;
      const booking = await client.query(
        `INSERT INTO bookings (user_id, spot_id, starts_at, expires_at, reserved_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, status, booked_at, starts_at, expires_at, ended_at`,
        [
          req.user!.userId,
          spot_id,
          startsAt ? startsAt.toISOString() : null,
          expiresAt.toISOString(),
          req.user!.displayName,
        ],
      );
      await client.query("COMMIT");

      const b = booking.rows[0];
      res.status(201).json({
        ...b,
        spot_id,
        spot_number: spotRow.number,
        spot_label: spotRow.label,
        spot_floor: spotRow.floor,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/times — update reservation interval
router.patch("/:id/times", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { starts_at, expires_at } = req.body as {
      starts_at?: string;
      expires_at?: string;
    };
    if (!starts_at && !expires_at) {
      res
        .status(400)
        .json({ error: "At least one of starts_at or expires_at is required" });
      return;
    }

    const newStartsAt = starts_at ? new Date(starts_at) : null;
    const newExpiresAt = expires_at ? new Date(expires_at) : null;

    if (newStartsAt && isNaN(newStartsAt.getTime())) {
      res.status(400).json({ error: "Invalid starts_at" });
      return;
    }
    if (newExpiresAt && isNaN(newExpiresAt.getTime())) {
      res.status(400).json({ error: "Invalid expires_at" });
      return;
    }

    // Lock-then-update in a single transaction to prevent lost updates
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const bookingResult = await client.query(
        `SELECT id, user_id, spot_id, status, starts_at, expires_at FROM bookings WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (bookingResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      const booking = bookingResult.rows[0];

      if (booking.user_id !== req.user!.userId && req.user!.role !== "admin") {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Not your booking" });
        return;
      }
      if (booking.status !== "active") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Booking is not active" });
        return;
      }

      const result = await client.query(
        `UPDATE bookings
         SET starts_at  = COALESCE($1, starts_at),
             expires_at = COALESCE($2, expires_at)
         WHERE id = $3
         RETURNING id, status, booked_at, starts_at, expires_at, ended_at`,
        [
          newStartsAt ? newStartsAt.toISOString() : null,
          newExpiresAt ? newExpiresAt.toISOString() : null,
          id,
        ],
      );
      await client.query("COMMIT");

      res.json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/cancel — cancel an active booking
// Allowed by: booking owner, admin, or spot owner
router.patch("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock the booking row to prevent concurrent cancel/modify
      const bookingResult = await client.query(
        `SELECT b.id, b.user_id, b.spot_id, b.status,
                o.user_id AS spot_owner_username
         FROM bookings b
         JOIN spots s ON s.id = b.spot_id
         LEFT JOIN owners o ON o.id = s.owner_id
         WHERE b.id = $1
         FOR UPDATE OF b`,
        [id],
      );
      if (bookingResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      const booking = bookingResult.rows[0];

      const isBookingOwner = booking.user_id === req.user!.userId;
      const isAdmin = req.user!.role === "admin";
      const isSpotOwner =
        booking.spot_owner_username === req.user!.username;

      if (!isBookingOwner && !isAdmin && !isSpotOwner) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Not your booking" });
        return;
      }
      if (booking.status !== "active") {
        await client.query("ROLLBACK");
        res
          .status(409)
          .json({ error: "Booking is already cancelled or expired" });
        return;
      }

      // Record who cancelled: null = self, otherwise the canceller's display name
      const cancelledBy = isBookingOwner
        ? null
        : req.user!.displayName;

      await client.query(
        `UPDATE bookings SET status = 'cancelled', ended_at = now(), cancelled_by = $2 WHERE id = $1`,
        [id, cancelledBy],
      );
      // Only free the spot if this was its last active booking
      const remaining = await client.query(
        `SELECT id FROM bookings WHERE spot_id = $1 AND status = 'active' AND id != $2 LIMIT 1`,
        [booking.spot_id, id],
      );
      if (remaining.rows.length === 0) {
        await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
          booking.spot_id,
        ]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
