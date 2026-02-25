import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../middleware/auth.js'

const TEST_SECRET = 'test-secret'

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET
})

function makeReqResMock(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

describe('requireAuth middleware', () => {
  it('calls next() with a valid Bearer token', () => {
    const payload = { userId: 'u1', username: 'admin', role: 'admin' }
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' })
    const { req, res, next } = makeReqResMock(`Bearer ${token}`)

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect((req as unknown as { user: typeof payload }).user).toMatchObject(payload)
  })

  it('returns 401 when Authorization header is missing', () => {
    const { req, res, next } = makeReqResMock(undefined)

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is not a Bearer token', () => {
    const { req, res, next } = makeReqResMock('Basic dXNlcjpwYXNz')

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is expired', () => {
    const payload = { userId: 'u1', username: 'admin', role: 'admin' }
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '-1s' })
    const { req, res, next } = makeReqResMock(`Bearer ${token}`)

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is signed with wrong secret', () => {
    const token = jwt.sign({ userId: 'u1' }, 'wrong-secret', { expiresIn: '1h' })
    const { req, res, next } = makeReqResMock(`Bearer ${token}`)

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
