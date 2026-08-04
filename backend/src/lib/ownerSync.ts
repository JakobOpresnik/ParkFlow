/**
 * ownerSync.ts
 *
 * Persists each timesheet employee's identity — numeric AI uprava `user_id`,
 * work email, and assigned `parking_spot` — onto the matching `owners` row, so
 * ParkFlow holds the same ids the timesheet app does instead of resolving
 * employees by name at request time.
 *
 * Deliberately does NOT touch spot↔owner assignment: `spots.owner_id` stays
 * admin-managed, and a `parking_spot` that disagrees with it is logged as drift,
 * not "corrected". The timesheet API is the source of truth for who an employee
 * is, the admin panel for which spot is theirs.
 *
 * Owner rows are not 1:1 with employees, which is why nothing is ever created
 * or deleted here:
 *   - shared spots keep 2–3 co-owners in one row ("Iztok Kavkler / Jan Grošelj")
 *     and only the co-owner the timesheet reports gets linked;
 *   - the ACEX pool, placeholders (Tesla S/X) and external rentals (ARHEA, MIK,
 *     Reduxi) match no employee at all;
 *   - an employee with no owner row is reported and skipped.
 */

import { pool } from '../db/pool.js'
import { NOT_ACEX_OWNERS } from './acexOwners.js'
import type { EmployeeWeekPresence } from './presence.types.js'

interface MatchedOwner {
  id: string
  timesheet_user_id: number | null
  email: string | null
  parking_spot: string | null
  // Owner the spot named by the timesheet currently belongs to in ParkFlow
  // (NULL when that label doesn't exist or the spot has no owner) — used only
  // to report drift.
  spot_owner: string | null
}

// Find the one owner row an employee belongs to. Candidates are matched on any
// of four links and ranked narrowest-first: an id we already stored, then the
// work email, then the spot the timesheet assigns them (its label is our
// spots.label), then a name segment — the pre-existing heuristic, and the only
// one that can hit a shared "A / B" row.
//
// $5 excludes owner rows that aren't employees (public pool, placeholders,
// external rentals). Without it, a spot still parked on a placeholder row would
// hand that row a real person's email and id via the spot-label match.
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
  /** Employees with no owner row — expected for staff without a parking spot. */
  unmatched: string[]
  /** Spot assignments where the timesheet and ParkFlow disagree. */
  drift: string[]
}

export async function syncOwnersFromTimesheet(
  employees: EmployeeWeekPresence[],
): Promise<OwnerSyncSummary> {
  const summary: OwnerSyncSummary = { updated: 0, unmatched: [], drift: [] }
  const notEmployees = [...NOT_ACEX_OWNERS]
  // One owner row per employee within a pass. A shared row ("Iztok Kavkler /
  // Jan Grošelj") matches either co-owner by name, so if the timesheet ever
  // reports both, the second would silently overwrite the first's id on every
  // sync. First match wins, and the loser is reported.
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
      // One row failing (e.g. two owner rows racing for the same employee id,
      // which the unique index rejects) must not abort the rest of the sync.
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
