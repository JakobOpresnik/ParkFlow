import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('../middleware/auth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: 'jsernec', username: 'jsernec', role: 'user' }
    next()
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireNonGuest: (_req: any, _res: any, next: any) => next(),
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => vi.resetAllMocks())
const app = createApp()

describe('GET /api/notifications', () => {
  it("returns the caller's notifications, unread first", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'n1', body: 'x', read_at: null }],
    })
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['jsernec'],
    )
  })

  it('filters to undelivered when ?undelivered=1', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await request(app).get('/api/notifications?undelivered=1')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('pushed_at IS NULL'),
      ['jsernec'],
    )
  })
})

describe('PATCH /api/notifications/:id/read', () => {
  it('marks one read, scoped to the caller', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const res = await request(app).patch('/api/notifications/n1/read')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET read_at = now()'),
      ['n1', 'jsernec'],
    )
  })
})

describe('PATCH /api/notifications/read-all', () => {
  it("marks all the caller's unread read", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 })
    const res = await request(app).patch('/api/notifications/read-all')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('GET /api/notifications/prefs', () => {
  it('returns the catalog and per-type state (absent = enabled)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ reminder_type: 'reservation_today', enabled: false }],
    })
    const res = await request(app).get('/api/notifications/prefs')
    expect(res.status).toBe(200)
    expect(
      res.body.catalog.some(
        (c: { type: string }) => c.type === 'reservation_today',
      ),
    ).toBe(true)
    expect(res.body.prefs.reservation_today).toBe(false)
  })

  it('defaults an absent type to enabled', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/notifications/prefs')
    expect(res.body.prefs.reservation_today).toBe(true)
  })
})

describe('PUT /api/notifications/prefs/:type', () => {
  it('upserts a known type', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const res = await request(app)
      .put('/api/notifications/prefs/reservation_today')
      .send({ enabled: false })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notification_prefs'),
      ['jsernec', 'reservation_today', false],
    )
  })

  it('rejects an unknown type', async () => {
    const res = await request(app)
      .put('/api/notifications/prefs/nope')
      .send({ enabled: true })
    expect(res.status).toBe(400)
  })

  it('rejects a non-boolean enabled', async () => {
    const res = await request(app)
      .put('/api/notifications/prefs/reservation_today')
      .send({ enabled: 'yes' })
    expect(res.status).toBe(400)
  })
})
