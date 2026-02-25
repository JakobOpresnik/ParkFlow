import { Router } from 'express'
import { pool } from '../db/pool.js'

const router = Router()

// BE-5: GET /api/owners — list all owners ordered by name
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM owners ORDER BY name')
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// BE-6: POST /api/owners — create new owner, validate required name
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, vehicle_plate, notes } = req.body as {
      name: string
      email?: string
      phone?: string
      vehicle_plate?: string
      notes?: string
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' })
      return
    }

    const result = await pool.query(
      `
      INSERT INTO owners (name, email, phone, vehicle_plate, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [name.trim(), email ?? null, phone ?? null, vehicle_plate ?? null, notes ?? null],
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

// BE-7: PUT /api/owners/:id — update owner data
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, email, phone, vehicle_plate, notes } = req.body as {
      name?: string
      email?: string
      phone?: string
      vehicle_plate?: string
      notes?: string
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ error: 'name cannot be empty' })
      return
    }

    const result = await pool.query(
      `
      UPDATE owners
      SET
        name          = COALESCE($1, name),
        email         = COALESCE($2, email),
        phone         = COALESCE($3, phone),
        vehicle_plate = COALESCE($4, vehicle_plate),
        notes         = COALESCE($5, notes)
      WHERE id = $6
      RETURNING *
    `,
      [
        name?.trim() ?? null,
        email ?? null,
        phone ?? null,
        vehicle_plate ?? null,
        notes ?? null,
        id,
      ],
    )

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Owner not found' })
      return
    }

    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

// BE-8: DELETE /api/owners/:id — delete owner (spot owner_id becomes null via FK)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query('DELETE FROM owners WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Owner not found' })
      return
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
