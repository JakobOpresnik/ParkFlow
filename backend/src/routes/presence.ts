import { Router } from 'express'

import { ljubljanaDate } from '../lib/localDate.js'
import { fetchWeekPresence } from '../lib/presence.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/presence?date=YYYY-MM-DD — weekly presence, defaults to today. Never
// anonymous; leave `status` is admin-only and email/parking_spot go to nobody.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { date } = req.query as { date?: string }

    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be in YYYY-MM-DD format' })
      return
    }

    const targetDate: string = date ?? ljubljanaDate(new Date())
    const { employees, work_free_days } = await fetchWeekPresence(targetDate)

    const isAdmin = req.user?.role === 'admin'
    const safeEmployees = employees.map((e) => ({
      user_id: e.user_id,
      name: e.name,
      week: e.week.map((d) =>
        isAdmin
          ? {
              date: d.date,
              status: d.status,
              is_work_free_day: d.is_work_free_day,
              parking_available: d.parking_available,
            }
          : {
              date: d.date,
              is_work_free_day: d.is_work_free_day,
              parking_available: d.parking_available,
            },
      ),
    }))
    res.json({ employees: safeEmployees, work_free_days })
  } catch (err) {
    next(err)
  }
})

export default router
