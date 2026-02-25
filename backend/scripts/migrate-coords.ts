/**
 * One-time migration: convert spot coordinates from absolute viewBox pixels
 * to relative (0–1) values normalised by each lot's image_width / image_height.
 *
 * Detection: any coord with x > 1 | y > 1 | width > 1 | height > 1 is absolute.
 *
 * Run from the backend directory:
 *   bun run scripts/migrate-coords.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

interface Coords {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  labelPosition?: string
  labelRotation?: number
}

interface SpotRow {
  id: string
  lot_id: string | null
  coordinates: Coords
}

interface LotRow {
  id: string
  image_width: number
  image_height: number
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const lotsRes = await pool.query<LotRow>(
    'SELECT id, image_width, image_height FROM parking_lots',
  )
  const lotMap = new Map<string, LotRow>(lotsRes.rows.map((l) => [l.id, l]))

  const spotsRes = await pool.query<SpotRow>(
    'SELECT id, lot_id, coordinates FROM spots WHERE coordinates IS NOT NULL',
  )

  let migrated = 0
  let skipped = 0

  for (const spot of spotsRes.rows) {
    const c = spot.coordinates
    if (!c) continue

    // Already relative — skip
    const isAbsolute = c.x > 1 || c.y > 1 || c.width > 1 || c.height > 1
    if (!isAbsolute) {
      skipped++
      continue
    }

    if (!spot.lot_id) {
      console.warn(`Spot ${spot.id}: no lot_id, skipping`)
      skipped++
      continue
    }

    const lot = lotMap.get(spot.lot_id)
    if (!lot) {
      console.warn(`Spot ${spot.id}: lot ${spot.lot_id} not found, skipping`)
      skipped++
      continue
    }

    const relCoords: Coords = {
      ...c,
      x: c.x / lot.image_width,
      y: c.y / lot.image_height,
      width: c.width / lot.image_width,
      height: c.height / lot.image_height,
    }

    await pool.query('UPDATE spots SET coordinates = $1 WHERE id = $2', [
      JSON.stringify(relCoords),
      spot.id,
    ])

    console.log(
      `Migrated spot ${spot.id}: (${c.x},${c.y} ${c.width}×${c.height}) → ` +
        `(${relCoords.x.toFixed(4)},${relCoords.y.toFixed(4)} ${relCoords.width.toFixed(4)}×${relCoords.height.toFixed(4)})`,
    )
    migrated++
  }

  console.log(`\nDone. Migrated: ${migrated}, already relative: ${skipped}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
