// Writes each employee's timesheet user_id, email and parking_spot onto their owners
// row. Never creates rows or touches spots.owner_id — mismatches are reported as drift.

import { pool } from '../db/pool.js'
import { NOT_ACEX_OWNERS } from './acexOwners.js'
import type { EmployeeWeekPresence } from './presence.types.js'

interface MatchedOwner {
  id: string
  timesheet_user_id: number | null
  email: string | null
  parking_spot: string | null
  // Who owns that spot in ParkFlow today (NULL if unknown/unowned) — drift only.
  spot_owner: string | null
}

// The employee's owner row, matched narrowest-first: stored id, email, spot label,
// name segment. $5 excludes non-employee rows (placeholders must not be linked).
const MATCH_SQL = `
  WITH candidates AS (
    SELECT
      o.id,
      o.name,
      o.timesheet_user_id,
      o.email,
      o.parking_spot,
      (
        SELECT sp.owner_id FROM spots sp
        WHERE sp.label = $3 AND sp.owner_id IS NOT NULL
        LIMIT 1
      ) AS spot_owner
    FROM owners o
    WHERE NOT (o.name = ANY($5::text[]))
  )
  SELECT id, timesheet_user_id, email, parking_spot, spot_owner
  FROM candidates
  WHERE timesheet_user_id = $1
     OR ($2 <> '' AND LOWER(email) = LOWER($2))
     OR id = spot_owner
     OR LOWER($4) IN (
          SELECT TRIM(LOWER(n))
          FROM unnest(string_to_array(name, '/')) AS t(n)
        )
  ORDER BY
    CASE
      WHEN timesheet_user_id = $1 THEN 1
      WHEN $2 <> '' AND LOWER(email) = LOWER($2) THEN 2
      WHEN id = spot_owner THEN 3
      ELSE 4
    END
  LIMIT 1`

export interface OwnerSyncSummary {
  updated: number
  /** Employees with no owner row — expected for staff without a spot. */
  unmatched: string[]
  /** Spots where the timesheet and ParkFlow disagree. */
  drift: string[]
}

export async function syncOwnersFromTimesheet(
  employees: EmployeeWeekPresence[],
): Promise<OwnerSyncSummary> {
  const summary: OwnerSyncSummary = { updated: 0, unmatched: [], drift: [] }
  const notEmployees = [...NOT_ACEX_OWNERS]
  // Both co-owners of a shared row match it by name — first wins, loser reported,
  // so they can't overwrite each other's id on every sync.
  const claimed = new Set<string>()

  for (const employee of employees) {
    const email = employee.email ?? ''
    const spot = employee.parking_spot ?? ''

    try {
      const { rows } = await pool.query(MATCH_SQL, [
        employee.user_id,
        email,
        spot,
        employee.name,
        notEmployees,
      ])
      const owner = rows[0] as MatchedOwner | undefined

      if (!owner) {
        summary.unmatched.push(`${employee.name} (${spot || 'no spot'})`)
        continue
      }

      if (claimed.has(owner.id)) {
        summary.unmatched.push(`${employee.name} (owner row already claimed)`)
        continue
      }
      claimed.add(owner.id)

      if (spot && owner.spot_owner === null) {
        summary.drift.push(
          `${employee.name}: ${spot} is unassigned in ParkFlow`,
        )
      } else if (spot && owner.spot_owner !== owner.id) {
        summary.drift.push(`${employee.name}: ${spot} belongs to another owner`)
      }

      const unchanged =
        owner.timesheet_user_id === employee.user_id &&
        (owner.email ?? '') === email &&
        (owner.parking_spot ?? '') === spot
      if (unchanged) continue

      await pool.query(
        `UPDATE owners
         SET timesheet_user_id = $1, email = $2, parking_spot = $3
         WHERE id = $4`,
        [employee.user_id, email || null, spot || null, owner.id],
      )
      summary.updated++
    } catch (err) {
      // One bad row must not abort the rest of the sync.
      console.error(
        `[ownerSync] ${employee.name} (user_id=${employee.user_id}) failed:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  console.log(
    `[ownerSync] ${employees.length} employee(s): ${summary.updated} owner row(s) updated`,
  )
  if (summary.unmatched.length > 0) {
    console.warn(
      `[ownerSync] no owner row for: ${summary.unmatched.join(', ')}`,
    )
  }
  if (summary.drift.length > 0) {
    console.warn(`[ownerSync] spot drift: ${summary.drift.join('; ')}`)
  }

  return summary
}
