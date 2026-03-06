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

    // Auto-cancel existing active booking for this user only if it's on the same day
    // as the new booking — reservations on other days must not be affected.
    const existing = await pool.query(
      `SELECT b.id, b.spot_id FROM bookings b
       WHERE b.user_id = $1 AND b.status = 'active'
         AND b.expires_at::date = $2::date`,
      [req.user!.userId, expiresAt.toISOString()],
    );
    if (existing.rows.length > 0) {
      const old = existing.rows[0] as { id: string; spot_id: string };
      const cancelClient = await pool.connect();
      try {
        await cancelClient.query("BEGIN");
        await cancelClient.query(
          `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
          [old.id],
        );
        // Only free the spot if no other active bookings remain for it
        const otherActive = await cancelClient.query(
          `SELECT id FROM bookings WHERE spot_id = $1 AND status = 'active' AND id != $2 LIMIT 1`,
          [old.spot_id, old.id],
        );
        if (otherActive.rows.length === 0) {
          await cancelClient.query(
            `UPDATE spots SET status = 'free' WHERE id = $1`,
            [old.spot_id],
          );
        }
        await cancelClient.query("COMMIT");
      } catch (err) {
        await cancelClient.query("ROLLBACK");
        throw err;
      } finally {
        cancelClient.release();
      }
    }

    // Spot must be free (either in DB, or effectively free because owner is absent today)
    const spotResult = await pool.query(
      `SELECT s.id, s.status, o.name AS owner_name
       FROM spots s
       LEFT JOIN owners o ON s.owner_id = o.id
       WHERE s.id = $1`,
      [spot_id],
    );
    if (spotResult.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }

    const spotRow = spotResult.rows[0] as {
      id: string;
      status: string;
      owner_name: string | null;
    };
    let isBookable = spotRow.status === "free";

    // A spot reserved for a DIFFERENT day is available for the target date
    if (!isBookable && spotRow.status === "reserved") {
      const conflict = await pool.query(
        `SELECT id FROM bookings
         WHERE spot_id = $1 AND status = 'active' AND expires_at::date = $2::date`,
        [spot_id, expiresAt.toISOString()],
      );
      isBookable = conflict.rows.length === 0;
    }

    if (!isBookable && spotRow.status === "occupied" && spotRow.owner_name) {
      const targetDate = expiresAt.toISOString().slice(0, 10);
      const presence = await fetchWeekPresence(targetDate);
      isBookable = isOwnerAbsent(presence, spotRow.owner_name, targetDate);
    }

    if (!isBookable) {
      res.status(409).json({ error: "Spot is not available for booking" });
      return;
    }

    // Create booking + reserve spot in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
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
      const spotInfo = await pool.query(
        "SELECT number, label, floor FROM spots WHERE id = $1",
        [spot_id],
      );
      const s = spotInfo.rows[0];
      res.status(201).json({
        ...b,
        spot_id,
        spot_number: s.number,
        spot_label: s.label,
        spot_floor: s.floor,
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

    const bookingResult = await pool.query(
      `SELECT id, user_id, spot_id, status, starts_at, expires_at FROM bookings WHERE id = $1`,
      [id],
    );
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const booking = bookingResult.rows[0];

    if (booking.user_id !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Not your booking" });
      return;
    }
    if (booking.status !== "active") {
      res.status(409).json({ error: "Booking is not active" });
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

    const result = await pool.query(
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

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/cancel — cancel an active booking
router.patch("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const bookingResult = await pool.query(
      `SELECT id, user_id, spot_id, status FROM bookings WHERE id = $1`,
      [id],
    );
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const booking = bookingResult.rows[0];

    if (booking.user_id !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Not your booking" });
      return;
    }
    if (booking.status !== "active") {
      res
        .status(409)
        .json({ error: "Booking is already cancelled or expired" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
        [id],
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
