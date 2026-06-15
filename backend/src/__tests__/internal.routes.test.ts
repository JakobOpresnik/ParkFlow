import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))
vi.mock('../lib/reminderScheduler.js', () => ({
  runReminderTick: vi.fn(),
}))

const { runReminderTick } = await import('../lib/reminderScheduler.js')
const mockTick = runReminderTick as ReturnType<typeof vi.fn>

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
  process.env.REMINDER_TRIGGER_TOKEN = 'secret'
})

describe('POST /api/internal/reminders/run', () => {
  it('runs the tick when the token matches', async () => {
    mockTick.mockResolvedValueOnce(undefined)
    const res = await request(app)
      .post('/api/internal/reminders/run')
      .set('X-Reminder-Token', 'secret')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mockTick).toHaveBeenCalledTimes(1)
  })

  it('passes dryRun=true on ?dry=1 and reports the result', async () => {
    mockTick.mockResolvedValueOnce({ count: 2, dryRun: true })
    const res = await request(app)
      .post('/api/internal/reminders/run?dry=1')
      .set('X-Reminder-Token', 'secret')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, count: 2, dryRun: true })
    expect(mockTick).toHaveBeenCalledWith(expect.any(Date), { dryRun: true })
  })

  it('rejects a wrong token with 401 and does not run', async () => {
    const res = await request(app)
      .post('/api/internal/reminders/run')
      .set('X-Reminder-Token', 'nope')
    expect(res.status).toBe(401)
    expect(mockTick).not.toHaveBeenCalled()
  })

  it('rejects a missing token with 401', async () => {
    const res = await request(app).post('/api/internal/reminders/run')
    expect(res.status).toBe(401)
    expect(mockTick).not.toHaveBeenCalled()
  })

  it('returns 500 when the trigger is not configured', async () => {
    delete process.env.REMINDER_TRIGGER_TOKEN
    const res = await request(app)
      .post('/api/internal/reminders/run')
      .set('X-Reminder-Token', 'whatever')
    expect(res.status).toBe(500)
    expect(mockTick).not.toHaveBeenCalled()
  })
})
