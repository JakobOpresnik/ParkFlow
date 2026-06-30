import { Router } from 'express'

import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/stats/history — historical occupancy signal derived from:
//   1. bookings — each reservation contributes a tally per hour/day it covered,
//      using its actual starts_at/expires_at so non-standard hours are respected.
//      Cancelled bookings are included; they still indicate intended peak demand.
//   2. spot_day_status 'occupied' overrides — treated as business-hours (09:00–17:00)
//      since no hour information is stored.
// Query params:
//   lot_id?        — scope to a single parking lot
//   days?          — window for the daily series (default 30, max 365)
//   heatmap_days?  — window for the heatmap (default 90, max 365)
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const {
      lot_id,
      days: daysParam,
      heatmap_days: heatmapDaysParam,
    } = req.query as {
      lot_id?: string
      days?: string
      heatmap_days?: string
    }

    const clampDays = (raw: unknown, fallback: number): number => {
      const n = Number(raw)
      return Number.isFinite(n) && n > 0
        ? Math.min(365, Math.max(1, Math.floor(n)))
        : fallback
    }

    const days = clampDays(daysParam, 30)
    const heatmapDays = clampDays(heatmapDaysParam, 90)
    const dailyInterval = `${days} days`
    const heatmapInterval = `${heatmapDays} days`

    const lotFilter = lot_id ? 'AND s.lot_id = $1' : ''
    const params: string[] = lot_id ? [lot_id] : []

    const heatmapQuery = `
      WITH booking_hours AS (
        SELECT h
        FROM bookings b
        JOIN spots s ON b.spot_id = s.id
        CROSS JOIN LATERAL generate_series(
          date_trunc('hour', GREATEST(
            COALESCE(b.starts_at, b.booked_at),
            NOW() - INTERVAL '${heatmapInterval}'
          )),
          date_trunc('hour', LEAST(
            COALESCE(b.ended_at, b.expires_at),
            NOW()
          ) - INTERVAL '1 second'),
          INTERVAL '1 hour'
        ) AS h
        WHERE COALESCE(b.starts_at, b.booked_at) < NOW()
          AND COALESCE(b.ended_at, b.expires_at) > NOW() - INTERVAL '${heatmapInterval}'
          ${lotFilter}
      ),
      override_hours AS (
        SELECT (sds.date + (hr || ' hours')::interval) AS h
        FROM spot_day_status sds
        JOIN spots s ON sds.spot_id = s.id
        CROSS JOIN generate_series(9, 16) AS hr
        WHERE sds.status = 'occupied'
          AND sds.date >= (NOW() - INTERVAL '${heatmapInterval}')::date
          ${lotFilter}
      ),
      combined AS (
        SELECT h FROM booking_hours
        UNION ALL
        SELECT h FROM override_hours
      )
      SELECT
        EXTRACT(DOW  FROM h)::int AS weekday,
        EXTRACT(HOUR FROM h)::int AS hour,
        COUNT(*)::int             AS count
      FROM combined
      GROUP BY 1, 2
      ORDER BY 1, 2
    `

    const dailyQuery = `
      WITH booking_days AS (
        SELECT d
        FROM bookings b
        JOIN spots s ON b.spot_id = s.id
        CROSS JOIN LATERAL generate_series(
          GREATEST(
            date_trunc('day', COALESCE(b.starts_at, b.booked_at)),
            date_trunc('day', NOW() - INTERVAL '${dailyInterval}')
          ),
          LEAST(
            date_trunc('day', COALESCE(b.ended_at, b.expires_at)),
            date_trunc('day', NOW())
          ),
          INTERVAL '1 day'
        ) AS d
        WHERE COALESCE(b.starts_at, b.booked_at) < NOW()
          AND COALESCE(b.ended_at, b.expires_at) > NOW() - INTERVAL '${dailyInterval}'
          ${lotFilter}
      ),
      override_days AS (
        SELECT sds.date::timestamptz AS d
        FROM spot_day_status sds
        JOIN spots s ON sds.spot_id = s.id
        WHERE sds.status = 'occupied'
          AND sds.date >= (NOW() - INTERVAL '${dailyInterval}')::date
          ${lotFilter}
      ),
      combined AS (
        SELECT d FROM booking_days
        UNION ALL
        SELECT d FROM override_days
      )
      SELECT
        to_char(d, 'YYYY-MM-DD') AS date,
        COUNT(*)::int            AS count
      FROM combined
      GROUP BY 1
      ORDER BY 1
    `

    const [heatmap, daily] = await Promise.all([
      pool.query(heatmapQuery, params),
      pool.query(dailyQuery, params),
    ])

    res.json({
      heatmap: heatmap.rows,
      daily: daily.rows,
    })
  } catch (err) {
    next(err)
  }
})

export default router
