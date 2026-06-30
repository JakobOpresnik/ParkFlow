import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../middleware/auth.js'

const TEST_SECRET = 'dev-secret-change-in-production'

function makeReqResMock(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

function makeToken(payload: object, expiresIn: string = '1h') {
  return jwt.sign(payload, TEST_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  })
}

describe('requireAuth middleware', () => {
  it('calls next() with a valid backend JWT', async () => {
    const token = makeToken({
      userId: 'u1',
      username: 'admin',
      displayName: 'Admin User',
      role: 'admin',
    })

    const { req, res, next } = makeReqResMock(`Bearer ${token}`)
    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject({
      userId: 'u1',
      username: 'admin',
      role: 'admin',
    })
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

  it('returns 401 for an invalid (random) token', () => {
    const { req, res, next } = makeReqResMock('Bearer not-a-valid-jwt')
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 for an expired token', () => {
    const token = makeToken(
      { userId: 'u1', username: 'user', displayName: 'User', role: 'user' },
      '-1s',
    )

    const { req, res, next } = makeReqResMock(`Bearer ${token}`)
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('assigns role=user for non-admin tokens', () => {
    const token = makeToken({
      userId: 'u2',
      username: 'regularuser',
      displayName: 'Regular User',
      role: 'user',
    })

    const { req, res, next } = makeReqResMock(`Bearer ${token}`)
    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user?.role).toBe('user')
  })
})
