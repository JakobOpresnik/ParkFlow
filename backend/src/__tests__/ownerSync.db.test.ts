// DB-backed test: exercises the real SQL against real Postgres, which the mocked unit
// tests in ownerSync.test.ts cannot do.
//
// Two rules, and they pull in opposite directions:
//  - the timesheet is the source of truth for WHICH spot is whose, so spots.owner_id
//    is re-pointed to match it;
//  - but an employee is never IDENTIFIED by that spot. Identity comes from id/email/
//    name, because resolving it spot-first wrote one employee's email and user_id onto
//    a different person's owner row whenever ParkFlow and the timesheet disagreed.
//
// Runs when DATABASE_URL points at a database whose name contains "test" (see
// docker-compose.test.yml), or always in CI. It refuses to run against a database
// that isn't a test one, because it writes rows.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EmployeeWeekPresence } from '../lib/presence.types.js'

const DB_URL = process.env.DATABASE_URL
const IN_CI = Boolean(process.env.CI ?? process.env.GITLAB_CI)
const looksLikeTestDb = DB_URL ? /test/i.test(new URL(DB_URL).pathname) : false

// In CI this suite must actually run — a silent skip there would defeat the point.
if (IN_CI && !DB_URL) {
  throw new Error(
    'DATABASE_URL is required in CI so the owner-sync DB test cannot silently skip',
  )
}

const shouldRun = Boolean(DB_URL) && (looksLikeTestDb || IN_CI)

// Distinctive ids/labels so the fixtures can be cleaned up and can never collide
// with the seed data the migrations insert.
const SPOT_OWNER_ROW = 'dbdb0000-0000-0000-0000-000000000001'
const EMPLOYEE_ROW = 'dbdb0000-0000-0000-0000-000000000002'
const SPOT_LABEL = 'DBTEST-1'
const SPOT_NUMBER = 990001
const OUTSIDER = 'DbTest Outsider'
const EMPLOYEE = 'DbTest Employee'

function employee(over: Partial<EmployeeWeekPresence>): EmployeeWeekPresence {
  return {
    user_id: 990001,
    name: OUTSIDER,
    email: 'dbtest.outsider@example.test',
    parking_spot: SPOT_LABEL,
    week: [],
    ...over,
  }
}

describe.skipIf(!shouldRun)('syncOwnersFromTimesheet (real Postgres)', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let pool: any
  let syncOwnersFromTimesheet: any
  /* eslint-enable @typescript-eslint/no-explicit-any */

  beforeAll(async () => {
    // Imported lazily: db/pool.js throws at import time without DATABASE_URL.
    pool = (await import('../db/pool.js')).pool
    ;({ syncOwnersFromTimesheet } = await import('../lib/ownerSync.js'))

    const { runMigrations } = await import('../db/migrate.js')
    await runMigrations()

    await cleanup()
    // The scenario that caused the corruption: a spot the timesheet attributes to
    // one employee is assigned, in ParkFlow, to a different owner row.
    await pool.query(
      `INSERT INTO owners (id, name) VALUES ($1, $2), ($3, $4)`,
      [SPOT_OWNER_ROW, OUTSIDER + ' SpotHolder', EMPLOYEE_ROW, EMPLOYEE],
    )
    await pool.query(
      `INSERT INTO spots (number, label, owner_id) VALUES ($1, $2, $3)`,
      [SPOT_NUMBER, SPOT_LABEL, SPOT_OWNER_ROW],
    )
  }, 60_000)

  async function cleanup(): Promise<void> {
    await pool.query(`DELETE FROM spots WHERE label = $1 OR number = $2`, [
      SPOT_LABEL,
      SPOT_NUMBER,
    ])
    await pool.query(`DELETE FROM owners WHERE id IN ($1, $2)`, [
      SPOT_OWNER_ROW,
      EMPLOYEE_ROW,
    ])
  }

  afterAll(async () => {
    if (!pool) return
    await cleanup()
    await pool.end()
  })

  it('does not write an employee onto the row that merely holds their spot', async () => {
    const summary = await syncOwnersFromTimesheet([employee({})])

    const { rows } = await pool.query(
      `SELECT timesheet_user_id, email, parking_spot FROM owners WHERE id = $1`,
      [SPOT_OWNER_ROW],
    )
    // Untouched: no name or email link exists, so the spot must not create one.
    expect(rows[0]).toMatchObject({
      timesheet_user_id: null,
      email: null,
      parking_spot: null,
    })
    expect(summary.updated).toBe(0)
    expect(summary.unmatched.join(' ')).toContain(OUTSIDER)
  })

  it('links by name and takes the spot the timesheet gives them', async () => {
    const summary = await syncOwnersFromTimesheet([
      employee({
        user_id: 990002,
        name: EMPLOYEE,
        email: 'dbtest.employee@example.test',
        parking_spot: SPOT_LABEL,
      }),
    ])

    const owner = await pool.query(
      `SELECT timesheet_user_id, email, parking_spot FROM owners WHERE id = $1`,
      [EMPLOYEE_ROW],
    )
    expect(owner.rows[0]).toEqual({
      timesheet_user_id: 990002,
      email: 'dbtest.employee@example.test',
      parking_spot: SPOT_LABEL,
    })
    expect(summary.updated).toBe(1)

    // The timesheet is authoritative: the spot moves off the row that held it.
    const spot = await pool.query(
      `SELECT owner_id FROM spots WHERE label = $1`,
      [SPOT_LABEL],
    )
    expect(spot.rows[0].owner_id).toBe(EMPLOYEE_ROW)
    expect(summary.reassigned).toEqual([`${SPOT_LABEL} -> ${EMPLOYEE}`])
  })

  it('audits the reassignment the way an admin change is audited', async () => {
    const { rows } = await pool.query(
      `SELECT change_type, old_value, new_value, changed_by
       FROM spot_changes
       WHERE spot_id = (SELECT id FROM spots WHERE label = $1)
       ORDER BY changed_at DESC LIMIT 1`,
      [SPOT_LABEL],
    )
    expect(rows[0]).toMatchObject({
      change_type: 'owner_assigned',
      old_value: SPOT_OWNER_ROW,
      new_value: EMPLOYEE_ROW,
      changed_by: 'timesheet',
    })
  })

  it('is idempotent — a second sync writes nothing', async () => {
    const summary = await syncOwnersFromTimesheet([
      employee({
        user_id: 990002,
        name: EMPLOYEE,
        email: 'dbtest.employee@example.test',
        parking_spot: SPOT_LABEL,
      }),
    ])

    expect(summary).toEqual({
      updated: 0,
      reassigned: [],
      unmatched: [],
      unknownSpots: [],
    })
  })

  it('reports a parking_spot label that does not exist here', async () => {
    const summary = await syncOwnersFromTimesheet([
      employee({
        user_id: 990002,
        name: EMPLOYEE,
        email: 'dbtest.employee@example.test',
        parking_spot: 'DBTEST-NOPE',
      }),
    ])

    expect(summary.unknownSpots).toEqual([`${EMPLOYEE}: DBTEST-NOPE`])
  })
})
