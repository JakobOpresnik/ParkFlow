import { Router } from 'express'

import { pool } from '../db/pool.js'
import { requireAuth, requireNonGuest } from '../middleware/auth.js'
import { REMINDER_TYPES } from '../lib/reminders.js'

const router = Router()

// GET /api/notifications  (?undelivered=1 → only unread AND never proactively pushed)
router.get('/', requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    const undelivered = req.query.undelivered === '1'
    const where = undelivered
      ? 'WHERE user_id = $1 AND read_at IS NULL AND pushed_at IS NULL'
      : 'WHERE user_id = $1'
    const result = await pool.query(
      `SELECT id, type, title, body, data, created_at, read_at, pushed_at
       FROM notifications
       ${where}
       ORDER BY (read_at IS NULL) DESC, created_at DESC
       LIMIT 50`,
      [req.user!.userId],
    )
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/notifications/prefs — reminder catalog + this user's on/off state
router.get('/prefs', requireAuth, requireNonGuest, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT reminder_type, enabled FROM notification_prefs WHERE user_id = $1`,
      [req.user!.userId],
    )
    const overrides = new Map<string, boolean>(
      result.rows.map((r) => [r.reminder_type, r.enabled]),
    )
    const prefs: Record<string, boolean> = {}
    for (const rt of REMINDER_TYPES) {
      prefs[rt.type] = overrides.get(rt.type) ?? true
    }
    res.json({ catalog: REMINDER_TYPES, prefs })
  } catch (err) {
    next(err)
  }
})

// PUT /api/notifications/prefs/:type  body { enabled: boolean }
router.put(
  '/prefs/:type',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const type = req.params.type
      if (!REMINDER_TYPES.some((rt) => rt.type === type)) {
        res.status(400).json({ error: 'Unknown reminder type' })
        return
      }
      const enabled = (req.body as { enabled?: unknown }).enabled
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' })
        return
      }
      await pool.query(
        `INSERT INTO notification_prefs (user_id, reminder_type, enabled, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, reminder_type)
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
        [req.user!.userId, type, enabled],
      )
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/notifications/read-all  — must be before /:id/read
router.patch(
  '/read-all',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      await pool.query(
        `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
        [req.user!.userId],
      )
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/notifications/:id/read
router.patch(
  '/:id/read',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      await pool.query(
        `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
        [req.params.id, req.user!.userId],
      )
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

export default router
