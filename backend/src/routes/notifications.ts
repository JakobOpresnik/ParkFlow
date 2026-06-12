import { Router } from "express";

import { pool } from "../db/pool.js";
import { requireAuth, requireNonGuest } from "../middleware/auth.js";

const router = Router();

// GET /api/notifications  (?undelivered=1 → only unread AND never proactively pushed)
router.get("/", requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    const undelivered = req.query.undelivered === "1";
    const where = undelivered
      ? "WHERE user_id = $1 AND read_at IS NULL AND pushed_at IS NULL"
      : "WHERE user_id = $1";
    const result = await pool.query(
      `SELECT id, type, title, body, data, created_at, read_at, pushed_at
       FROM notifications
       ${where}
       ORDER BY (read_at IS NULL) DESC, created_at DESC
       LIMIT 50`,
      [req.user!.userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all  — must be before /:id/read
router.patch(
  "/read-all",
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      await pool.query(
        `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
        [req.user!.userId],
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/notifications/:id/read
router.patch(
  "/:id/read",
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      await pool.query(
        `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
        [req.params.id, req.user!.userId],
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
