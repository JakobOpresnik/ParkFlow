import { Router } from "express";

import { fetchWeekPresence } from "../lib/presence.js";

const router = Router();

// GET /api/presence?date=YYYY-MM-DD
// Proxies the Abelium timesheet /presence/week endpoint and returns weekly data.
// If date is omitted, defaults to today. Set TIMESHEET_MOCK=true to use local mock data.
router.get("/", async (req, res, next) => {
  try {
    const { date } = req.query as { date?: string };

    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
      return;
    }

    const targetDate: string = date ?? new Date().toISOString().slice(0, 10);
    const data = await fetchWeekPresence(targetDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
