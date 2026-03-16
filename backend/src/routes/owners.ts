import { Router } from "express";

import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/owners/me — owner profile for authenticated user
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM owners WHERE user_id = $1",
      [req.user!.username],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "No owner profile linked to your account" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/owners/me/spots — spots owned by authenticated user with active booking info
router.get("/me/spots", requireAuth, async (req, res, next) => {
  try {
    const ownerResult = await pool.query(
      "SELECT id FROM owners WHERE user_id = $1",
      [req.user!.username],
    );
    if (ownerResult.rows.length === 0) {
      res.status(404).json({ error: "No owner profile linked to your account" });
      return;
    }
    const ownerId = ownerResult.rows[0].id as string;

    const result = await pool.query(
      `SELECT
        s.id,
        s.number,
        s.label,
        s.floor,
        s.lot_id,
        s.status,
        s.coordinates,
        s.created_at,
        o.id            AS owner_id,
        o.name          AS owner_name,
        pl.name         AS lot_name,
        b.id            AS active_booking_id,
        b.user_id       AS active_booking_user_id,
        b.reserved_by   AS active_booking_reserved_by,
        b.starts_at     AS active_booking_starts_at,
        b.expires_at    AS active_booking_expires_at
      FROM spots s
      LEFT JOIN owners o ON s.owner_id = o.id
      LEFT JOIN parking_lots pl ON s.lot_id = pl.id
      LEFT JOIN bookings b ON b.spot_id = s.id AND b.status = 'active'
      WHERE s.owner_id = $1
      ORDER BY s.number`,
      [ownerId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/owners/me/week — bookings on owner's spots for a date range
router.get("/me/week", requireAuth, async (req, res, next) => {
  try {
    const ownerResult = await pool.query(
      "SELECT id FROM owners WHERE user_id = $1",
      [req.user!.username],
    );
    if (ownerResult.rows.length === 0) {
      res.status(404).json({ error: "No owner profile linked to your account" });
      return;
    }
    const ownerId = ownerResult.rows[0].id as string;

    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ error: "from and to query params required (YYYY-MM-DD)" });
      return;
    }

    const result = await pool.query(
      `SELECT
        b.id,
        b.spot_id,
        b.status,
        b.reserved_by,
        b.booked_at,
        b.starts_at,
        b.expires_at,
        b.ended_at,
        b.cancelled_by
      FROM bookings b
      JOIN spots s ON b.spot_id = s.id
      WHERE s.owner_id = $1
        AND b.expires_at >= ($2::date)
        AND b.booked_at <= ($3::date + interval '1 day')
      ORDER BY b.booked_at DESC`,
      [ownerId, from, to],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/owners/me/overrides?from=&to= — per-day status overrides for owner's spots
router.get("/me/overrides", requireAuth, async (req, res, next) => {
  try {
    const ownerResult = await pool.query(
      "SELECT id FROM owners WHERE user_id = $1",
      [req.user!.username],
    );
    if (ownerResult.rows.length === 0) {
      res.status(404).json({ error: "No owner profile linked to your account" });
      return;
    }
    const ownerId = ownerResult.rows[0].id as string;

    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ error: "from and to query params required" });
      return;
    }

    const result = await pool.query(
      `SELECT sds.id, sds.spot_id, sds.date, sds.status, sds.set_by
       FROM spot_day_status sds
       JOIN spots s ON sds.spot_id = s.id
       WHERE s.owner_id = $1 AND sds.date >= $2::date AND sds.date <= $3::date
       ORDER BY sds.date`,
      [ownerId, from, to],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/owners/me/spots/:spotId/day-status — set or clear per-day override
router.put("/me/spots/:spotId/day-status", requireAuth, async (req, res, next) => {
  try {
    const { spotId } = req.params;
    const { date, status } = req.body as { date: string; status: string | null };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
      return;
    }

    // Verify the caller owns this spot
    const check = await pool.query(
      `SELECT s.id FROM spots s
       JOIN owners o ON s.owner_id = o.id
       WHERE s.id = $1 AND o.user_id = $2`,
      [spotId, req.user!.username],
    );
    if (check.rows.length === 0) {
      res.status(403).json({ error: "Not your spot" });
      return;
    }

    if (status === null || status === undefined) {
      // Clear override — revert to timesheet
      await pool.query(
        `DELETE FROM spot_day_status WHERE spot_id = $1 AND date = $2`,
        [spotId, date],
      );
      res.json({ ok: true, cleared: true });
      return;
    }

    if (status !== "free" && status !== "occupied") {
      res.status(400).json({ error: "status must be 'free', 'occupied', or null" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO spot_day_status (spot_id, date, status, set_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (spot_id, date) DO UPDATE SET status = $3, set_by = $4
       RETURNING *`,
      [spotId, date, status, req.user!.displayName],
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owners/:id/link — admin links an owner to an SSO username
router.patch("/:id/link", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username } = req.body as { username: string | null };

    const result = await pool.query(
      `UPDATE owners SET user_id = $1 WHERE id = $2 RETURNING *`,
      [username?.trim() || null, id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Owner not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// BE-5: GET /api/owners — list all owners ordered by name
router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM owners ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// BE-6: POST /api/owners — create new owner, validate required name
router.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, vehicle_plate, notes, user_id } = req.body as {
      name: string;
      email?: string;
      phone?: string;
      vehicle_plate?: string;
      notes?: string;
      user_id?: string;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const result = await pool.query(
      `
      INSERT INTO owners (name, email, phone, vehicle_plate, notes, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        name.trim(),
        email ?? null,
        phone ?? null,
        vehicle_plate ?? null,
        notes ?? null,
        user_id?.trim() || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// BE-7: PUT /api/owners/:id — update owner data
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, vehicle_plate, notes, user_id } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      vehicle_plate?: string;
      notes?: string;
      user_id?: string | null;
    };

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
      res.status(400).json({ error: "name cannot be empty" });
      return;
    }

    const result = await pool.query(
      `
      UPDATE owners
      SET
        name          = COALESCE($1, name),
        email         = COALESCE($2, email),
        phone         = COALESCE($3, phone),
        vehicle_plate = COALESCE($4, vehicle_plate),
        notes         = COALESCE($5, notes),
        user_id       = $6
      WHERE id = $7
      RETURNING *
    `,
      [
        name?.trim() ?? null,
        email ?? null,
        phone ?? null,
        vehicle_plate ?? null,
        notes ?? null,
        user_id !== undefined ? (user_id?.trim() || null) : null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Owner not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// BE-8: DELETE /api/owners/:id — delete owner (spot owner_id becomes null via FK)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM owners WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Owner not found" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
