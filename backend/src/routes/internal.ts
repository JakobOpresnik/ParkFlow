import type { Request, Response } from 'express'
import { Router } from 'express'

import {
  runOwnerReminderTick,
  runReminderTick,
} from '../lib/reminderScheduler.js'

const router = Router()

// Both reminder triggers share the same shared secret. Returns true when the
// caller is authorized; otherwise writes the 401/500 response and returns false.
function authorizeTrigger(req: Request, res: Response): boolean {
  const expected = process.env.REMINDER_TRIGGER_TOKEN
  if (!expected) {
    res.status(500).json({ error: 'Reminder trigger is not configured.' })
    return false
  }
  if (req.get('x-reminder-token') !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

function wantsDryRun(req: Request): boolean {
  // req.body is undefined when no JSON body is sent (express.json skips it
  // without a Content-Type), so the optional chain is load-bearing, not noise.
  return (
    req.query.dry === '1' ||
    (req.body as { dryRun?: unknown } | undefined)?.dryRun === true
  )
}

// POST /api/internal/reminders/run — triggered by the reminders-cron service.
// Token-gated (X-Reminder-Token must equal REMINDER_TRIGGER_TOKEN). Not a user
// endpoint — no JWT, just the shared secret, mirroring the RocketChat webhook.
router.post('/reminders/run', async (req, res, next) => {
  try {
    if (!authorizeTrigger(req, res)) return
    const result = await runReminderTick(new Date(), {
      dryRun: wantsDryRun(req),
    })
    res.json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
})

// POST /api/internal/reminders/owners/run — afternoon "free your spot" nudge to
// every parking-spot owner. Same reminders-cron service, same shared secret.
router.post('/reminders/owners/run', async (req, res, next) => {
  try {
    if (!authorizeTrigger(req, res)) return
    const result = await runOwnerReminderTick(new Date(), {
      dryRun: wantsDryRun(req),
    })
    res.json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
})

export default router
