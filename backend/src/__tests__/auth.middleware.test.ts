import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'

function makeReqResMock(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

function stubFetch(ok: boolean, userinfo?: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: async () => userinfo ?? {},
    }),
  )
}

describe('requireAuth middleware', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls next() with a valid Bearer token', async () => {
    stubFetch(true, { sub: 'u1', preferred_username: 'admin', groups: ['parkflow-admins'] })

    const { req, res, next } = makeReqResMock('Bearer valid-token')
    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject({ userId: 'u1', username: 'admin', role: 'admin' })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { req, res, next } = makeReqResMock(undefined)
    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is not a Bearer token', async () => {
    const { req, res, next } = makeReqResMock('Basic dXNlcjpwYXNz')
    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is expired', async () => {
    stubFetch(false)
    const { req, res, next } = makeReqResMock('Bearer expired-token')
    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', async () => {
    stubFetch(false)
    const { req, res, next } = makeReqResMock('Bearer invalid-token')
    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
