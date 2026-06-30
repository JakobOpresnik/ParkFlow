import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app.js'

vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

const TEST_SECRET = 'dev-secret-change-in-production'
const app = createApp()

function makeToken(payload: object, expiresIn: string = '1h') {
  return jwt.sign(payload, TEST_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  })
}

function stubFetch(responses: Array<{ ok: boolean; body: object | string }>) {
  let call = 0
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const r = responses[call++] ?? responses[responses.length - 1]!
      return Promise.resolve({
        ok: r.ok,
        text: async () =>
          typeof r.body === 'string' ? r.body : JSON.stringify(r.body),
        json: async () => r.body,
      })
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

// ── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-jwt')
    expect(res.status).toBe(401)
  })

  it('returns user info with a valid backend JWT', async () => {
    const token = makeToken({
      userId: 'uuid-1',
      username: 'admin',
      displayName: 'Admin User',
      role: 'admin',
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.username).toBe('admin')
    expect(res.body.role).toBe('admin')
  })

  it('returns role=user for a non-admin token', async () => {
    const token = makeToken({
      userId: 'uuid-2',
      username: 'regularuser',
      displayName: 'Regular User',
      role: 'user',
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('user')
  })
})

// ── POST /api/auth/exchange ──────────────────────────────────────────────────

describe('POST /api/auth/exchange', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/exchange')
      .send({ code: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/code_verifier/)
  })

  it('returns 401 when Authentik token exchange fails', async () => {
    stubFetch([{ ok: false, body: 'invalid_grant' }])

    const res = await request(app).post('/api/auth/exchange').send({
      code: 'bad-code',
      code_verifier: 'verifier',
      redirect_uri: 'https://example.com/callback',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Token exchange failed/)
  })

  it('returns 401 when userinfo fetch fails', async () => {
    stubFetch([
      { ok: true, body: { access_token: 'at', id_token: null } },
      { ok: false, body: 'unauthorized' },
    ])

    const res = await request(app).post('/api/auth/exchange').send({
      code: 'code',
      code_verifier: 'verifier',
      redirect_uri: 'https://example.com/callback',
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/user info/)
  })

  it('returns backend JWT on successful exchange', async () => {
    stubFetch([
      { ok: true, body: { access_token: 'at', id_token: null } },
      {
        ok: true,
        body: {
          sub: 'user-uuid',
          preferred_username: 'janez',
          name: 'Janez Novak',
          groups: ['parkflow-admins'],
        },
      },
    ])

    const res = await request(app).post('/api/auth/exchange').send({
      code: 'valid-code',
      code_verifier: 'verifier',
      redirect_uri: 'https://example.com/callback',
    })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()

    // Verify the issued token contains correct claims
    const decoded = jwt.verify(res.body.token, TEST_SECRET) as Record<
      string,
      unknown
    >
    expect(decoded.username).toBe('janez')
    // userId must be the preferred_username (not the opaque Authentik sub) so that
    // bookings made via the web key on the same identity the RocketChat bot uses.
    expect(decoded.userId).toBe('janez')
    expect(decoded.role).toBe('admin')
  })

  it('assigns role=user when not in admin group', async () => {
    stubFetch([
      { ok: true, body: { access_token: 'at', id_token: null } },
      {
        ok: true,
        body: {
          sub: 'user-uuid-2',
          preferred_username: 'meta',
          name: 'Meta Novak',
          groups: [],
        },
      },
    ])

    const res = await request(app).post('/api/auth/exchange').send({
      code: 'valid-code',
      code_verifier: 'verifier',
      redirect_uri: 'https://example.com/callback',
    })

    expect(res.status).toBe(200)
    const decoded = jwt.verify(res.body.token, TEST_SECRET) as Record<
      string,
      unknown
    >
    expect(decoded.role).toBe('user')
  })
})
