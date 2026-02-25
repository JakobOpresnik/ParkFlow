import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const secret = () => process.env.JWT_SECRET ?? 'dev-secret-change-me'

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body as {
      username?: string
      password?: string
    }
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' })
      return
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, display_name, role FROM app_users WHERE username = $1',
      [username],
    )
    const user = result.rows[0]
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      secret(),
      { expiresIn: '24h' },
    )

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me — returns current user from token
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, role FROM app_users WHERE id = $1',
      [req.user!.userId],
    )
    const user = result.rows[0]
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    })
  } catch (err) {
    next(err)
  }
})

export default router
