import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { addClient, clientCount } from '../lib/broadcast.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const KEEPALIVE_INTERVAL_MS = 30_000

/**
 * EventSource doesn't support custom headers, so the frontend passes the JWT
 * as a query parameter (?token=...). This middleware copies it into the
 * Authorization header so requireAuth works as usual.
 */
function tokenFromQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.headers.authorization && typeof req.query.token === 'string') {
    req.headers.authorization = `Bearer ${req.query.token}`
  }
  next()
}

// GET /api/subscribe — SSE stream for real-time updates
router.get('/', tokenFromQuery, requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering
  res.flushHeaders()

  // Send initial connection confirmation
  res.write(
    `event: connected\ndata: ${JSON.stringify({ clients: clientCount() + 1 })}\n\n`,
  )

  const removeClient = addClient(res)

  // Keepalive ping to prevent proxy/firewall timeouts
  const keepalive = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      clearInterval(keepalive)
    }
  }, KEEPALIVE_INTERVAL_MS)

  req.on('close', () => {
    clearInterval(keepalive)
    removeClient()
  })
})

export default router
