import { Router } from "express";

import { runReminderTick } from "../lib/reminderScheduler.js";

const router = Router();

// POST /api/internal/reminders/run — triggered by the reminders-cron service.
// Token-gated (X-Reminder-Token must equal REMINDER_TRIGGER_TOKEN). Not a user
// endpoint — no JWT, just the shared secret, mirroring the RocketChat webhook.
router.post("/reminders/run", async (req, res, next) => {
  try {
    const expected = process.env.REMINDER_TRIGGER_TOKEN;
    if (!expected) {
      res.status(500).json({ error: "Reminder trigger is not configured." });
      return;
    }
    if (req.get("x-reminder-token") !== expected) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await runReminderTick(new Date());
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
