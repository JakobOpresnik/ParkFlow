import { Router } from 'express';

const router = Router();

const TIMESHEET_BASE_URL =
  process.env.TIMESHEET_API_URL ?? 'https://timesheet.abelium.com/api';

// GET /api/presence?date=YYYY-MM-DD
// Proxies the Abelium timesheet presence endpoint and returns the raw data.
// If date is omitted, defaults to today.
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query as { date?: string };

    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
      return;
    }

    const targetDate: string = date ?? new Date().toISOString().slice(0, 10);

    const url = `${TIMESHEET_BASE_URL}/presence?date=${encodeURIComponent(targetDate)}`;

    const response = await fetch(url);

    if (!response.ok) {
      res.status(response.status).json({
        error: `Timesheet API error: ${response.status} ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
