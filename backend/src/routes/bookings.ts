import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function expireStaleBookings(): Promise<void> {
  await pool.query(`
    WITH expired AS (
      UPDATE bookings
      SET status = 'expired', ended_at = now()
      WHERE status = 'active' AND expires_at < now()
      RETURNING spot_id
    )
    UPDATE spots
    SET status = 'free'
    WHERE id IN (SELECT spot_id FROM expired)
  `)
}

// GET /api/bookings/my — current user's bookings (active first, then history)
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    await expireStaleBookings()

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.status,
        b.booked_at,
        b.expires_at,
        b.ended_at,
        s.id AS spot_id,
        s.number AS spot_number,
        s.label AS spot_label,
        s.floor AS spot_floor
      FROM bookings b
      JOIN spots s ON b.spot_id = s.id
      WHERE b.user_id = $1
      ORDER BY b.booked_at DESC
    `,
      [req.user!.userId],
    )

    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// POST /api/bookings — book a free spot
router.post('/', requireAuth, async (req, res, next) => {
  try {
    await expireStaleBookings()

    const { spot_id } = req.body as { spot_id?: string }
    if (!spot_id) {
      res.status(400).json({ error: 'spot_id is required' })
      return
    }

    // One active booking per user
    const existing = await pool.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND status = 'active'`,
      [req.user!.userId],
    )
    if (existing.rows.length > 0) {
      res.status(409).json({
        error: 'You already have an active booking. Cancel it first.',
      })
      return
    }

    // Spot must be free
    const spotResult = await pool.query(
      'SELECT id, status FROM spots WHERE id = $1',
      [spot_id],
    )
    if (spotResult.rows.length === 0) {
      res.status(404).json({ error: 'Spot not found' })
      return
    }
    if (spotResult.rows[0].status !== 'free') {
      res.status(409).json({ error: 'Spot is not available for booking' })
      return
    }

    // Create booking + reserve spot in a transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`UPDATE spots SET status = 'reserved' WHERE id = $1`, [
        spot_id,
      ])
      const booking = await client.query(
        `INSERT INTO bookings (user_id, spot_id, expires_at)
         VALUES ($1, $2, now() + interval '8 hours')
         RETURNING id, status, booked_at, expires_at, ended_at`,
        [req.user!.userId, spot_id],
      )
      await client.query('COMMIT')

      const b = booking.rows[0]
      const spotInfo = await pool.query(
        'SELECT number, label, floor FROM spots WHERE id = $1',
        [spot_id],
      )
      const s = spotInfo.rows[0]
      res.status(201).json({
        ...b,
        spot_id,
        spot_number: s.number,
        spot_label: s.label,
        spot_floor: s.floor,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    next(err)
  }
})

// PATCH /api/bookings/:id/cancel — cancel an active booking
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params

    const bookingResult = await pool.query(
      `SELECT id, user_id, spot_id, status FROM bookings WHERE id = $1`,
      [id],
    )
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ error: 'Booking not found' })
      return
    }
    const booking = bookingResult.rows[0]

    if (booking.user_id !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not your booking' })
      return
    }
    if (booking.status !== 'active') {
      res.status(409).json({ error: 'Booking is already cancelled or expired' })
      return
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE bookings SET status = 'cancelled', ended_at = now() WHERE id = $1`,
        [id],
      )
      await client.query(`UPDATE spots SET status = 'free' WHERE id = $1`, [
        booking.spot_id,
      ])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
