import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createApp } from '../app.js'

vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>
const mockConnect = pool.connect as ReturnType<typeof vi.fn>

const TEST_SECRET = 'test-secret'
const TEST_USER = { userId: 'user-1', username: 'admin', role: 'admin' }

function authToken() {
  return `Bearer ${jwt.sign(TEST_USER, TEST_SECRET, { expiresIn: '1h' })}`
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.JWT_SECRET = TEST_SECRET
})

const app = createApp()

describe('POST /api/bookings', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/bookings').send({ spot_id: 'spot-1' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when spot_id is missing', async () => {
    // Mock expireStaleBookings (two queries: UPDATE bookings + UPDATE spots via WITH CTE = one query)
    mockQuery.mockResolvedValueOnce({ rows: [] }) // expire
    mockQuery.mockResolvedValueOnce({ rows: [] }) // no active booking check skipped by missing spot_id

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', authToken())
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/spot_id/)
  })

  it('returns 409 when user already has an active booking', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({ rows: [{ id: 'existing-booking' }] }) // active booking check

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', authToken())
      .send({ spot_id: 'spot-1' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already have an active booking/)
  })

  it('returns 409 when spot is not free', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({ rows: [] }) // no existing booking
      .mockResolvedValueOnce({ rows: [{ id: 'spot-1', status: 'occupied' }] }) // spot status

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', authToken())
      .send({ spot_id: 'spot-1' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/not available/)
  })

  it('returns 201 and creates booking for a free spot', async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE spots
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'booking-1',
              status: 'active',
              booked_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
              ended_at: null,
            },
          ],
        }) // INSERT booking
        .mockResolvedValueOnce({}), // COMMIT
      release: vi.fn(),
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({ rows: [] }) // no existing booking
      .mockResolvedValueOnce({ rows: [{ id: 'spot-1', status: 'free' }] }) // spot check
      .mockResolvedValueOnce({
        rows: [{ number: 5, label: 'A5', floor: 'P1' }],
      }) // spot info after booking

    mockConnect.mockResolvedValueOnce(mockClient)

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', authToken())
      .send({ spot_id: 'spot-1' })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('active')
    expect(res.body.spot_number).toBe(5)
  })
})

describe('PATCH /api/bookings/:id/cancel', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/bookings/booking-1/cancel')
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent booking', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch('/api/bookings/non-existent/cancel')
      .set('Authorization', authToken())

    expect(res.status).toBe(404)
  })

  it('returns 409 when booking is already cancelled', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'b1', user_id: TEST_USER.userId, spot_id: 's1', status: 'cancelled' }],
    })

    const res = await request(app)
      .patch('/api/bookings/b1/cancel')
      .set('Authorization', authToken())

    expect(res.status).toBe(409)
  })

  it('cancels an active booking successfully', async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE bookings
        .mockResolvedValueOnce({}) // UPDATE spots
        .mockResolvedValueOnce({}), // COMMIT
      release: vi.fn(),
    }

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'b1', user_id: TEST_USER.userId, spot_id: 's1', status: 'active' }],
    })
    mockConnect.mockResolvedValueOnce(mockClient)

    const res = await request(app)
      .patch('/api/bookings/b1/cancel')
      .set('Authorization', authToken())

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('GET /api/bookings/my', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/bookings/my')
    expect(res.status).toBe(401)
  })

  it('returns bookings array for authenticated user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'b1',
            status: 'active',
            booked_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
            ended_at: null,
            spot_id: 's1',
            spot_number: 3,
            spot_label: 'A3',
            spot_floor: 'P1',
          },
        ],
      })

    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', authToken())

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].spot_number).toBe(3)
  })
})
