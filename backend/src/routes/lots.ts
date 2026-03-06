import { Router } from "express";

import { pool } from "../db/pool.js";

const router = Router();

// GET /api/lots — all parking lots ordered by sort_order
router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM parking_lots ORDER BY sort_order, name",
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/lots — create a parking lot
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      description,
      image_filename,
      image_width,
      image_height,
      sort_order,
    } = req.body as {
      name?: string;
      description?: string;
      image_filename?: string;
      image_width?: number;
      image_height?: number;
      sort_order?: number;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO parking_lots (name, description, image_filename, image_width, image_height, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name.trim(),
        description ?? null,
        image_filename ?? "parking-map.png",
        image_width ?? 1200,
        image_height ?? 700,
        sort_order ?? 0,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/lots/:id — update a parking lot
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      image_filename,
      image_width,
      image_height,
      sort_order,
    } = req.body as {
      name?: string;
      description?: string;
      image_filename?: string;
      image_width?: number;
      image_height?: number;
      sort_order?: number;
    };

    const result = await pool.query(
      `UPDATE parking_lots
       SET name           = COALESCE($1, name),
           description    = COALESCE($2, description),
           image_filename = COALESCE($3, image_filename),
           image_width    = COALESCE($4, image_width),
           image_height   = COALESCE($5, image_height),
           sort_order     = COALESCE($6, sort_order)
       WHERE id = $7 RETURNING *`,
      [
        name?.trim() ?? null,
        description ?? null,
        image_filename ?? null,
        image_width ?? null,
        image_height ?? null,
        sort_order ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Parking lot not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/lots/:id — delete a parking lot (only if empty)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const spotsCheck = await pool.query(
      "SELECT COUNT(*) FROM spots WHERE lot_id = $1",
      [id],
    );
    if (parseInt(spotsCheck.rows[0].count) > 0) {
      res.status(409).json({
        error:
          "Cannot delete a lot that still has parking spots. Remove or reassign spots first.",
      });
      return;
    }

    const result = await pool.query(
      "DELETE FROM parking_lots WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Parking lot not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
