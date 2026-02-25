import { Router } from 'express'
import { pool } from '../db/pool.js'

const router = Router()

// GET /api/changes — last 50 spot changes, with spot number and lot info
router.get('/', async (req, res, next) => {
  try {
    const { lot_id } = req.query as { lot_id?: string }

    let query = `
      SELECT
        sc.id,
        sc.spot_id,
        sc.change_type,
        sc.old_value,
        sc.new_value,
        sc.changed_by,
        sc.changed_at,
        s.number  AS spot_number,
        s.label   AS spot_label,
        s.lot_id  AS spot_lot_id,
        pl.name   AS lot_name
      FROM spot_changes sc
      JOIN spots s ON sc.spot_id = s.id
      LEFT JOIN parking_lots pl ON s.lot_id = pl.id
    `
    const params: string[] = []

    if (lot_id) {
      query += ' WHERE s.lot_id = $1'
      params.push(lot_id)
    }

    query += ' ORDER BY sc.changed_at DESC LIMIT 50'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

export default router
