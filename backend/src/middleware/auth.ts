import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export type Role = 'admin' | 'user' | 'guest'

export interface AuthPayload {
  userId: string
  username: string
  displayName: string
  role: Role
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload &
      jwt.JwtPayload
    req.user = {
      userId: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

export function requireNonGuest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role === 'guest') {
    res.status(403).json({ error: 'Guest accounts cannot perform this action' })
    return
  }
  next()
}
