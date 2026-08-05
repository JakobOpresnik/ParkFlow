// The timesheet is the source of truth. Each employee's user_id, email and
// parking_spot are written onto their owners row, and spots.owner_id is re-pointed to
// match — if AI uprava says 1VP55 is Bernard Sovdat's, it is his everywhere in the app.

import { pool } from '../db/pool.js'
import { NOT_ACEX_OWNERS } from './acexOwners.js'
import type { EmployeeWeekPresence } from './presence.types.js'

interface MatchedOwner {
  id: string
  timesheet_user_id: number | null
  email: string | null
  parking_spot: string | null
}

// WHO an employee is, matched narrowest-first: stored id, work email, then a name
// segment. $5 excludes non-employee rows (pool, placeholders, rentals).
//
// Deliberately independent of parking_spot. Identity comes first and the spot follows
// from it; resolving it the other way round (spot -> spots.owner_id -> that row) wrote
// one employee's email onto another person's row whenever the two disagreed.
const MATCH_SQL = `
  WITH candidates AS (
    SELECT o.id, o.name, o.timesheet_user_id, o.email, o.parking_spot
    FROM owners o
    WHERE NOT (o.name = ANY($4::text[]))
  )
  SELECT id, timesheet_user_id, email, parking_spot
  FROM candidates
  WHERE timesheet_user_id = $1
     OR ($2 <> '' AND LOWER(email) = LOWER($2))
     OR LOWER($3) IN (
          SELECT TRIM(LOWER(n))
          FROM unnest(string_to_array(name, '/')) AS t(n)
        )
  ORDER BY
    CASE
      WHEN timesheet_user_id = $1 THEN 1
      WHEN $2 <> '' AND LOWER(email) = LOWER($2) THEN 2
      ELSE 3
    END
  LIMIT 1`

export interface OwnerSyncSummary {
  /** Owner rows whose timesheet identity fields were written. */
  updated: number
  /** Spots re-pointed at the owner the timesheet names. */
  reassigned: string[]
  /** Employees with no owner row — nothing is ever created for them. */
  unmatched: string[]
  /** parking_spot values with no matching spots.label in ParkFlow. */
  unknownSpots: string[]
}

/**
 * Re-points a spot at the owner the timesheet says holds it, auditing the change the
 * same way the admin PATCH does. Returns true when it actually moved.
 */
async function assignSpot(
  label: string,
  ownerId: string,
  employeeName: string,
  summary: OwnerSyncSummary,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id, owner_id FROM spots WHERE label = $1 ORDER BY id LIMIT 1`,
    [label],
  )
  const spot = rows[0] as { id: string; owner_id: string | null } | undefined

  if (!spot) {
    summary.unknownSpots.push(`${employeeName}: ${label}`)
    return false
  }
  if (spot.owner_id === ownerId) return false

  await pool.query(`UPDATE spots SET owner_id = $1 WHERE id = $2`, [
    ownerId,
    spot.id,
  ])
  await pool
    .query(
      `INSERT INTO spot_changes (spot_id, change_type, old_value, new_value, changed_by)
       VALUES ($1, 'owner_assigned', $2, $3, 'timesheet')`,
      [spot.id, spot.owner_id, ownerId],
    )
    .catch(() => {
      /* audit log failure is non-fatal, same as the admin route */
    })

  summary.reassigned.push(`${label} -> ${employeeName}`)
  return true
}

export async function syncOwnersFromTimesheet(
  employees: EmployeeWeekPresence[],
): Promise<OwnerSyncSummary> {
  const summary: OwnerSyncSummary = {
    updated: 0,
    reassigned: [],
    unmatched: [],
    unknownSpots: [],
  }
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

      const identityChanged =
        owner.timesheet_user_id !== employee.user_id ||
        (owner.email ?? '') !== email ||
        (owner.parking_spot ?? '') !== spot
      if (identityChanged) {
        await pool.query(
          `UPDATE owners
           SET timesheet_user_id = $1, email = $2, parking_spot = $3
           WHERE id = $4`,
          [employee.user_id, email || null, spot || null, owner.id],
        )
        summary.updated++
      }

      // Runs every sync, not only when the identity changed: an admin may have
      // re-pointed the spot in between, and the timesheet wins.
      if (spot) await assignSpot(spot, owner.id, employee.name, summary)
    } catch (err) {
      // One bad row must not abort the rest of the sync.
      console.error(
        `[ownerSync] ${employee.name} (user_id=${employee.user_id}) failed:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  console.log(
    `[ownerSync] ${employees.length} employee(s): ${summary.updated} owner row(s) updated, ${summary.reassigned.length} spot(s) reassigned`,
  )
  if (summary.reassigned.length > 0) {
    console.warn(`[ownerSync] reassigned: ${summary.reassigned.join('; ')}`)
  }
  if (summary.unmatched.length > 0) {
    console.warn(
      `[ownerSync] no owner row for: ${summary.unmatched.join(', ')}`,
    )
  }
  if (summary.unknownSpots.length > 0) {
    console.warn(
      `[ownerSync] spot label not in ParkFlow: ${summary.unknownSpots.join(', ')}`,
    )
  }

  return summary
}
