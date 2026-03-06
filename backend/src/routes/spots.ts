import { Router } from "express";

import { pool } from "../db/pool.js";

const router = Router();

const ACEX_OWNER_NAME = "ACEX - kdor prej pride, prej melje";

const SPOT_SELECT = `
  SELECT
    s.id,
    s.number,
    s.label,
    s.floor,
    s.lot_id,
    CASE WHEN o.name = '${ACEX_OWNER_NAME}' THEN 'free' ELSE s.status END AS status,
    s.coordinates,
    s.created_at,
    o.id            AS owner_id,
    o.name          AS owner_name,
    o.email         AS owner_email,
    o.phone         AS owner_phone,
    o.vehicle_plate AS owner_vehicle_plate,
    o.notes         AS owner_notes,
    b.id            AS active_booking_id,
    b.user_id       AS active_booking_user_id,
    b.reserved_by   AS active_booking_reserved_by,
    b.starts_at     AS active_booking_starts_at,
    b.expires_at    AS active_booking_expires_at
  FROM spots s
  LEFT JOIN owners o ON s.owner_id = o.id
  LEFT JOIN bookings b ON b.spot_id = s.id AND b.status = 'active'
`;

// BE-1: GET /api/spots — all spots, optionally filtered by ?lot_id=
router.get("/", async (req, res, next) => {
  try {
    const { lot_id } = req.query as { lot_id?: string };

    let query = SPOT_SELECT;
    const params: string[] = [];

    if (lot_id) {
      query += " WHERE s.lot_id = $1";
      params.push(lot_id);
    }
    query += " ORDER BY s.number";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// BE-2: GET /api/spots/:number — single spot by number (first match across lots)
router.get("/:number", async (req, res, next) => {
  try {
    const number = parseInt(req.params.number, 10);
    if (isNaN(number)) {
      res.status(400).json({ error: "Spot number must be an integer" });
      return;
    }

    const result = await pool.query(
      SPOT_SELECT + " WHERE s.number = $1 ORDER BY s.number LIMIT 1",
      [number],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Spot ${number} not found` });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Admin: POST /api/spots — create a new spot
router.post("/", async (req, res, next) => {
  try {
    const { number, label, lot_id, status } = req.body as {
      number?: number;
      label?: string;
      lot_id?: string;
      status?: string;
    };

    if (typeof number !== "number" || !Number.isInteger(number) || number < 1) {
      res.status(400).json({ error: "number must be a positive integer" });
      return;
    }
    if (!lot_id) {
      res.status(400).json({ error: "lot_id is required" });
      return;
    }

    const validStatuses = ["free", "occupied", "reserved"];
    const spotStatus =
      status && validStatuses.includes(status) ? status : "free";

    const result = await pool.query(
      `INSERT INTO spots (number, label, lot_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id, number, label, floor, lot_id, status, coordinates, created_at`,
      [number, label?.trim() ?? null, lot_id, spotStatus],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Admin: PUT /api/spots/:id — full update of a spot
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { number, label, lot_id, status } = req.body as {
      number?: number;
      label?: string;
      lot_id?: string;
      status?: string;
    };

    const validStatuses = ["free", "occupied", "reserved"];
    if (status && !validStatuses.includes(status)) {
      res
        .status(400)
        .json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const result = await pool.query(
      `UPDATE spots
       SET number = COALESCE($1, number),
           label  = COALESCE($2, label),
           lot_id = COALESCE($3, lot_id),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING id, number, label, floor, lot_id, status, coordinates, created_at`,
      [
        number ?? null,
        label !== undefined ? label?.trim() || null : null,
        lot_id ?? null,
        status ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Admin: DELETE /api/spots/:id — delete a spot
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM spots WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// MAP-EDITOR: PATCH /api/spots/:id/coordinates — save or clear coordinates
router.patch("/:id/coordinates", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { coordinates } = req.body as {
      coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        labelPosition: string;
      } | null;
    };

    if (coordinates !== null && coordinates !== undefined) {
      const { x, y, width, height, rotation } = coordinates;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof width !== "number" ||
        typeof height !== "number" ||
        typeof rotation !== "number"
      ) {
        res.status(400).json({
          error: "coordinates must have numeric x, y, width, height, rotation",
        });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE spots SET coordinates = $1 WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, coordinates`,
      [coordinates != null ? JSON.stringify(coordinates) : null, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// BE-3: PATCH /api/spots/:id/owner — assign or unassign owner
router.patch("/:id/owner", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { owner_id } = req.body as { owner_id: string | null };

    if (owner_id !== null && typeof owner_id !== "string") {
      res.status(400).json({ error: "owner_id must be a UUID string or null" });
      return;
    }

    if (owner_id !== null) {
      const ownerCheck = await pool.query(
        "SELECT id FROM owners WHERE id = $1",
        [owner_id],
      );
      if (ownerCheck.rows.length === 0) {
        res.status(404).json({ error: "Owner not found" });
        return;
      }
    }

    // Fetch old owner for audit log
    const before = await pool.query(
      "SELECT owner_id FROM spots WHERE id = $1",
      [id],
    );
    if (before.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }
    const oldOwnerId = before.rows[0].owner_id as string | null;

    const result = await pool.query(
      `UPDATE spots SET owner_id = $1
       WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, owner_id, coordinates`,
      [owner_id, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }

    // Audit log
    const changeType = owner_id ? "owner_assigned" : "owner_unassigned";
    await pool
      .query(
        `INSERT INTO spot_changes (spot_id, change_type, old_value, new_value)
       VALUES ($1, $2, $3, $4)`,
        [id, changeType, oldOwnerId, owner_id],
      )
      .catch(() => {
        /* audit log failure is non-fatal */
      });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// BE-4: PATCH /api/spots/:id/status — update status with enum validation
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    const validStatuses = ["free", "occupied", "reserved"];
    if (!validStatuses.includes(status)) {
      res
        .status(400)
        .json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    // Fetch old status for audit log
    const before = await pool.query("SELECT status FROM spots WHERE id = $1", [
      id,
    ]);
    if (before.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }
    const oldStatus = before.rows[0].status as string;

    const result = await pool.query(
      `UPDATE spots SET status = $1
       WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, owner_id, coordinates`,
      [status, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Spot not found" });
      return;
    }

    // Audit log
    await pool
      .query(
        `INSERT INTO spot_changes (spot_id, change_type, old_value, new_value)
       VALUES ($1, 'status_changed', $2, $3)`,
        [id, oldStatus, status],
      )
      .catch(() => {
        /* audit log failure is non-fatal */
      });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
