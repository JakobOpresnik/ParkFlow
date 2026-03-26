import { Router } from "express";

import { pool } from "../db/pool.js";
import { broadcast } from "../lib/broadcast.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/feedback — create a feature request (authenticated users)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const { title, description, category } = req.body as {
      title?: string;
      description?: string;
      category?: string;
    };

    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    const validCategories = ["general", "bug", "feature", "improvement"];
    const cat = category && validCategories.includes(category) ? category : "general";

    const result = await pool.query(
      `INSERT INTO feature_requests (user_id, display_name, title, description, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.userId, user.displayName, title, description, cat],
    );

    broadcast();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback — list all feature requests (admin only)
router.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM feature_requests ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/feedback/:id/status — update status (admin only)
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    const validStatuses = ["open", "in_progress", "done", "dismissed"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const result = await pool.query(
      "UPDATE feature_requests SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Feature request not found" });
      return;
    }

    broadcast();
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/feedback/:id — delete a feature request (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM feature_requests WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Feature request not found" });
      return;
    }

    broadcast();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
