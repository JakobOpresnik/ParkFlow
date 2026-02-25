import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/auth/me — returns current user from token (validated via Authentik userinfo)
router.get('/me', requireAuth, (_req, res) => {
  res.json({
    id: _req.user!.userId,
    username: _req.user!.username,
    displayName: _req.user!.username,
    role: _req.user!.role,
  })
})

export default router
