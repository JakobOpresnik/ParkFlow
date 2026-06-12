import { Router } from "express";

import { ljubljanaDate } from "../lib/localDate.js";
import { fetchWeekPresence } from "../lib/presence.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/presence?date=YYYY-MM-DD
// Proxies the Abelium timesheet /presence/week endpoint and returns weekly data.
// If date is omitted, defaults to today (Slovenian local day).
//
// requireAuth: this exposes per-employee presence — it must never be readable
// anonymously. Guests are allowed (the public map needs parking_available), but
// the sensitive per-day leave/health `status` (sick/care/vacation/remote) is
// stripped for everyone except admins; the UI only ever reads parking_available.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { date } = req.query as { date?: string };

    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
      return;
    }

    const targetDate: string = date ?? ljubljanaDate(new Date());
    const { employees, work_free_days } = await fetchWeekPresence(targetDate);

    if (req.user?.role === "admin") {
      res.json({ employees, work_free_days });
      return;
    }

    // Non-admins: drop the leave/health reason from every day entry.
    const safeEmployees = employees.map((e) => ({
      user_id: e.user_id,
      name: e.name,
      week: e.week.map((d) => ({
        date: d.date,
        is_work_free_day: d.is_work_free_day,
        parking_available: d.parking_available,
      })),
    }));
    res.json({ employees: safeEmployees, work_free_days });
  } catch (err) {
    next(err);
  }
});

export default router;
