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
      username: 'jana',
      displayName: 'Jana Novak',
      role: 'user',
    }
    next()
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireNonGuest: (_req: any, _res: any, next: any) => next(),
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
})

const app = createApp()

const SPOT_ID = 'spot-uuid-1'
const URL = `/api/owners/me/spots/${SPOT_ID}/day-status`

const OVERRIDE_ROW = {
  id: 'sds-uuid-1',
  spot_id: SPOT_ID,
  date: '2026-08-17',
  status: 'occupied',
  set_by: 'Jana Novak',
}

function mockOwnershipOk() {
  mockQuery.mockResolvedValueOnce({ rows: [{ id: SPOT_ID }] })
}

describe('PUT /api/owners/me/spots/:spotId/day-status', () => {
  it('returns 400 when date is missing and not indefinite', async () => {
    const res = await request(app).put(URL).send({ status: 'occupied' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/date/)
  })

  it('returns 400 when days is out of range', async () => {
    const res = await request(app)
      .put(URL)
      .send({ date: '2026-08-17', status: 'occupied', days: 40 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/days/)
  })

  it('returns 403 when the caller does not own the spot', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put(URL)
      .send({ date: '2026-08-17', status: 'occupied' })

    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid status value', async () => {
    mockOwnershipOk()

    const res = await request(app)
      .put(URL)
      .send({ date: '2026-08-17', status: 'reserved' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status/)
  })

  it('upserts a single day by default', async () => {
    mockOwnershipOk()
    mockQuery.mockResolvedValueOnce({ rows: [OVERRIDE_ROW] })

    const res = await request(app)
      .put(URL)
      .send({ date: '2026-08-17', status: 'occupied' })

    expect(res.status).toBe(200)
    const [sql, params] = mockQuery.mock.calls[1]!
    expect(sql).toContain('generate_series')
    expect(params).toEqual([SPOT_ID, '2026-08-17', 'occupied', 'Jana Novak', 1])
  })

  it('upserts a row per day for a multi-day span', async () => {
    mockOwnershipOk()
    mockQuery.mockResolvedValueOnce({ rows: [OVERRIDE_ROW] })

    const res = await request(app)
      .put(URL)
      .send({ date: '2026-08-17', status: 'occupied', days: 7 })

    expect(res.status).toBe(200)
    const [, params] = mockQuery.mock.calls[1]!
    expect(params[4]).toBe(7)
  })

  it('upserts the indefinite (date IS NULL) row', async () => {
    mockOwnershipOk()
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...OVERRIDE_ROW, date: null }],
    })

    const res = await request(app)
      .put(URL)
      .send({ status: 'occupied', indefinite: true })

    expect(res.status).toBe(200)
    const [sql, params] = mockQuery.mock.calls[1]!
    expect(sql).toContain('date IS NULL')
    // Setting indefinite clears stale future per-day rows in the same statement
    expect(sql).toContain('date >= CURRENT_DATE')
    expect(params).toEqual([SPOT_ID, 'occupied', 'Jana Novak'])
  })

  it('clears a single day override', async () => {
    mockOwnershipOk()
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put(URL)
      .send({ date: '2026-08-17', status: null })

    expect(res.status).toBe(200)
    expect(res.body.cleared).toBe(true)
    const [sql, params] = mockQuery.mock.calls[1]!
    expect(sql).toContain('date = $2')
    expect(params).toEqual([SPOT_ID, '2026-08-17'])
  })

  it('clears the indefinite override', async () => {
    mockOwnershipOk()
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put(URL)
      .send({ status: null, indefinite: true })

    expect(res.status).toBe(200)
    expect(res.body.cleared).toBe(true)
    const [sql, params] = mockQuery.mock.calls[1]!
    expect(sql).toContain('date IS NULL')
    expect(params).toEqual([SPOT_ID])
  })
})
