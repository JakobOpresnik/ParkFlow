import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'

vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

vi.mock('../middleware/auth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      userId: 'test-user',
      username: 'jan',
      displayName: 'Jan',
      role: 'user',
    }
    next()
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = {
      userId: 'test-user',
      username: 'jan',
      displayName: 'Jan',
      role: 'user',
    }
    next()
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireNonGuest: (_req: any, _res: any, next: any) => next(),
}))

vi.mock('../lib/broadcast.js', () => ({ broadcast: vi.fn() }))

vi.mock('../lib/presence.js', () => ({
  fetchWeekPresence: vi.fn().mockResolvedValue({
    employees: [],
    work_free_days: [],
  }),
  isOwnerAbsent: vi.fn().mockReturnValue(false),
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>
const mockConnect = pool.connect as ReturnType<typeof vi.fn>

function makeClient() {
  return {
    query: vi.fn(),
    release: vi.fn(),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

const app = createApp()

describe('POST /api/spots/:id/spotted', () => {
  it('inserts a new report on a free spot', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      // BEGIN
      .mockResolvedValueOnce({ rows: [] })
      // SELECT spot
      .mockResolvedValueOnce({
        rows: [{ id: 'spot-1', status: 'free', owner_name: null }],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      // booking conflict check
      .mockResolvedValueOnce({ rows: [] })
      // existing active report check
      .mockResolvedValueOnce({ rows: [] })
      // clear stale
      .mockResolvedValueOnce({ rows: [] })
      // insert
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            reported_at: '2026-05-14T10:00:00Z',
            expires_at: '2026-05-14T14:00:00Z',
          },
        ],
      })
      // COMMIT
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('report-1')
  })

  it('returns existing active report idempotently', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'spot-1', status: 'free', owner_name: null }],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'existing-report',
            reported_at: '2026-05-14T09:55:00Z',
            expires_at: '2026-05-14T13:55:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('existing-report')
  })

  it('returns 412 when spot is not free', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'spot-1', status: 'reserved', owner_name: null }],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(412)
    expect(res.body.error).toMatch(/free/i)
  })

  it('returns 412 when spot has an active booking today', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'spot-1', status: 'free', owner_name: null }],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(412)
  })

  it('returns 404 when spot does not exist', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/missing/spotted')

    expect(res.status).toBe(404)
  })

  it('treats ACEX-owned spots as free for reporting purposes', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'spot-1',
            status: 'occupied',
            owner_name: 'ACEX - kdor prej pride, prej melje',
          },
        ],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            reported_at: '2026-05-14T10:00:00Z',
            expires_at: '2026-05-14T14:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(201)
  })

  it('allows reporting an owned spot whose owner is absent today', async () => {
    const { isOwnerAbsent } = await import('../lib/presence.js')
    ;(isOwnerAbsent as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)

    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'spot-1',
            status: 'occupied',
            owner_name: 'Bernard Sovdat',
          },
        ],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            reported_at: '2026-05-14T10:00:00Z',
            expires_at: '2026-05-14T14:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(201)
  })

  it('rejects reporting an owned spot whose owner is in office today', async () => {
    const { isOwnerAbsent } = await import('../lib/presence.js')
    ;(isOwnerAbsent as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)

    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'spot-1',
            status: 'occupied',
            owner_name: 'Bernard Sovdat',
          },
        ],
      })
      // spot_day_status override check
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(412)
  })

  it('honors day-override status: free → reportable', async () => {
    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'spot-1',
            status: 'occupied',
            owner_name: 'Bernard Sovdat',
          },
        ],
      })
      // spot_day_status override → free
      .mockResolvedValueOnce({ rows: [{ status: 'free' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            reported_at: '2026-05-14T10:00:00Z',
            expires_at: '2026-05-14T14:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(201)
  })

  it('honors day-override status: occupied → rejected even if owner absent', async () => {
    const { isOwnerAbsent } = await import('../lib/presence.js')
    ;(isOwnerAbsent as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)

    const client = makeClient()
    mockConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'spot-1',
            status: 'occupied',
            owner_name: 'Bernard Sovdat',
          },
        ],
      })
      // spot_day_status override → occupied
      .mockResolvedValueOnce({ rows: [{ status: 'occupied' }] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/spots/spot-1/spotted')

    expect(res.status).toBe(412)
  })
})

describe('DELETE /api/spots/:id/spotted', () => {
  it('clears an active report and returns ok', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'report-1' }] })

    const res = await request(app).delete('/api/spots/spot-1/spotted')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 404 when no active report exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const res = await request(app).delete('/api/spots/spot-1/spotted')

    expect(res.status).toBe(404)
  })
})
