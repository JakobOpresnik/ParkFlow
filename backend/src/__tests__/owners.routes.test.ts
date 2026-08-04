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
    req.user = { userId: 'test-user', username: 'admin', role: 'admin' }
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

const OWNER = {
  id: 'owner-uuid-1',
  name: 'Janez Novak',
  email: 'janez@example.com',
  phone: '041000000',
  vehicle_plate: 'LJ-123-AB',
  notes: null,
  created_at: new Date().toISOString(),
}

describe('GET /api/owners', () => {
  it('returns all owners', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [OWNER] })

    const res = await request(app).get('/api/owners')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Janez Novak')
  })

  it('returns empty array when no owners exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/owners')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/owners/user-ids', () => {
  // /user-ids takes no auth — it is consumed only by the internal Friday
  // reminder flow.
  it('returns a flat array of owner user IDs (no auth required)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'jakobo' }, { user_id: 'jdoe' }],
    })

    const res = await request(app).get('/api/owners/user-ids')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(['jakobo', 'jdoe'])
  })

  it('returns an empty array when no owners are linked', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/owners/user-ids')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('requires no token at all', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'jakobo' }] })

    const res = await request(app).get('/api/owners/user-ids')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(['jakobo'])
  })
})

// Gone: AI uprava reports each employee's parking_spot itself, and no GET route
// is left to match (the :id routes are all PATCH/PUT/DELETE).
describe('GET /api/owners/timesheet-ids', () => {
  it('no longer exists', async () => {
    const res = await request(app).get('/api/owners/timesheet-ids')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/owners', () => {
  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/owners').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/)
  })

  it('returns 400 when name is empty string', async () => {
    const res = await request(app).post('/api/owners').send({ name: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/)
  })

  it('creates owner with name only', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...OWNER, email: null, phone: null }],
    })

    const res = await request(app)
      .post('/api/owners')
      .send({ name: 'Janez Novak' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Janez Novak')
  })

  it('creates owner with all fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [OWNER] })

    const res = await request(app).post('/api/owners').send({
      name: 'Janez Novak',
      email: 'janez@example.com',
      phone: '041000000',
      vehicle_plate: 'LJ-123-AB',
    })

    expect(res.status).toBe(201)
    expect(res.body.vehicle_plate).toBe('LJ-123-AB')
  })
})

describe('PUT /api/owners/:id', () => {
  it('returns 404 for non-existent owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put('/api/owners/non-existent-id')
      .send({ name: 'New Name' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('returns 400 when name is set to empty string', async () => {
    const res = await request(app)
      .put('/api/owners/owner-uuid-1')
      .send({ name: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/)
  })

  it('updates owner name', async () => {
    const updated = { ...OWNER, name: 'Updated Name' }
    mockQuery.mockResolvedValueOnce({ rows: [updated] })

    const res = await request(app)
      .put('/api/owners/owner-uuid-1')
      .send({ name: 'Updated Name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Name')
  })

  it('updates owner vehicle plate', async () => {
    const updated = { ...OWNER, vehicle_plate: 'MB-999-ZZ' }
    mockQuery.mockResolvedValueOnce({ rows: [updated] })

    const res = await request(app)
      .put('/api/owners/owner-uuid-1')
      .send({ vehicle_plate: 'MB-999-ZZ' })

    expect(res.status).toBe(200)
    expect(res.body.vehicle_plate).toBe('MB-999-ZZ')
  })
})

describe('DELETE /api/owners/:id', () => {
  it('returns 404 for non-existent owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).delete('/api/owners/non-existent-id')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('deletes owner successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'owner-uuid-1' }] })

    const res = await request(app).delete('/api/owners/owner-uuid-1')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
