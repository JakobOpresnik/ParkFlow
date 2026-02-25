import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../app.js'

// Mock the database pool
vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
  process.env.JWT_SECRET = 'test-secret'
})

const app = createApp()

describe('POST /api/auth/login', () => {
  it('returns 400 when credentials are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  it('returns 401 for unknown username', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'secret' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Invalid credentials/)
  })

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', 4)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'uuid-1',
          username: 'admin',
          password_hash: hash,
          display_name: 'Administrator',
          role: 'admin',
        },
      ],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })

    expect(res.status).toBe(401)
  })

  it('returns token + user for correct credentials', async () => {
    const hash = await bcrypt.hash('admin', 4)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'uuid-1',
          username: 'admin',
          password_hash: hash,
          display_name: 'Administrator',
          role: 'admin',
        },
      ],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.username).toBe('admin')
    expect(res.body.user.role).toBe('admin')
    expect(res.body.user).not.toHaveProperty('password_hash')
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns user info with valid token', async () => {
    // First login to get a token
    const hash = await bcrypt.hash('admin', 4)
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-1',
            username: 'admin',
            password_hash: hash,
            display_name: 'Administrator',
            role: 'admin',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'uuid-1',
            username: 'admin',
            display_name: 'Administrator',
            role: 'admin',
          },
        ],
      })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' })

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`)

    expect(meRes.status).toBe(200)
    expect(meRes.body.username).toBe('admin')
  })
})
