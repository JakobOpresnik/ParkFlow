import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmployeeWeekPresence } from '../lib/presence.types.js'

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>
const { syncOwnersFromTimesheet } = await import('../lib/ownerSync.js')

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function employee(
  over: Partial<EmployeeWeekPresence> = {},
): EmployeeWeekPresence {
  return {
    user_id: 11,
    name: 'Marko Boben',
    email: 'marko.boben@abelium.com',
    parking_spot: 'K1-25',
    week: [],
    ...over,
  }
}

const OWNER_ROW = {
  id: 'owner-1',
  timesheet_user_id: 11,
  email: 'marko.boben@abelium.com',
  parking_spot: 'K1-25',
}
const UNLINKED_ROW = {
  id: 'owner-1',
  timesheet_user_id: null,
  email: null,
  parking_spot: null,
}

/** The queries the sync issues, in order: match, [owner update], spot lookup, … */
function mockQueries(...results: unknown[][]): void {
  for (const rows of results) mockQuery.mockResolvedValueOnce({ rows })
}

describe('syncOwnersFromTimesheet', () => {
  it('writes id, email and spot onto a matched but unlinked owner row', async () => {
    mockQueries(
      [UNLINKED_ROW], // match
      [], // UPDATE owners
      [{ id: 'spot-1', owner_id: 'owner-1' }], // spot lookup — already correct
    )

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.updated).toBe(1)
    expect(summary.reassigned).toEqual([])
    const update = mockQuery.mock.calls[1]!
    expect(update[0]).toMatch(/UPDATE owners/)
    expect(update[1]).toEqual([
      11,
      'marko.boben@abelium.com',
      'K1-25',
      'owner-1',
    ])
  })

  it('never matches on the parking spot — identity is id/email/name only', async () => {
    mockQueries([]) // no owner row matches

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.updated).toBe(0)
    expect(summary.unmatched).toEqual(['Marko Boben (K1-25)'])
    // Only the match query ran: no owner UPDATE, no spot write.
    expect(mockQuery).toHaveBeenCalledTimes(1)
    // The spot label must not appear as a matching parameter.
    expect(mockQuery.mock.calls[0]![1]).not.toContain('K1-25')
  })

  it('re-points the spot at the timesheet owner and audits it', async () => {
    mockQueries(
      [OWNER_ROW], // match — identity already in sync
      [{ id: 'spot-1', owner_id: 'someone-else' }], // spot belongs to another row
      [], // UPDATE spots
      [], // INSERT spot_changes
    )

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.updated).toBe(0) // identity untouched
    expect(summary.reassigned).toEqual(['K1-25 -> Marko Boben'])

    const spotUpdate = mockQuery.mock.calls[2]!
    expect(spotUpdate[0]).toMatch(/UPDATE spots SET owner_id/)
    expect(spotUpdate[1]).toEqual(['owner-1', 'spot-1'])

    const audit = mockQuery.mock.calls[3]!
    expect(audit[0]).toMatch(/INSERT INTO spot_changes/)
    expect(audit[0]).toContain('owner_assigned')
    expect(audit[1]).toEqual(['spot-1', 'someone-else', 'owner-1'])
  })

  it('claims an unowned spot for its timesheet owner', async () => {
    mockQueries([OWNER_ROW], [{ id: 'spot-1', owner_id: null }], [], [])

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.reassigned).toEqual(['K1-25 -> Marko Boben'])
    expect(mockQuery.mock.calls[3]![1]).toEqual(['spot-1', null, 'owner-1'])
  })

  it('writes nothing when owner and spot already agree', async () => {
    mockQueries([OWNER_ROW], [{ id: 'spot-1', owner_id: 'owner-1' }])

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary).toEqual({
      updated: 0,
      reassigned: [],
      unmatched: [],
      unknownSpots: [],
    })
    expect(mockQuery).toHaveBeenCalledTimes(2) // match + spot lookup only
  })

  it('reports a parking_spot that does not exist in ParkFlow', async () => {
    mockQueries([OWNER_ROW], []) // spot label unknown

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.unknownSpots).toEqual(['Marko Boben: K1-25'])
    expect(summary.reassigned).toEqual([])
  })

  it('reports an employee with no owner row instead of creating one', async () => {
    mockQueries([])

    const summary = await syncOwnersFromTimesheet([
      employee({ user_id: 99, name: 'Borut Mrak', parking_spot: 'K1-9' }),
    ])

    expect(summary.unmatched).toEqual(['Borut Mrak (K1-9)'])
    expect(mockQuery).toHaveBeenCalledTimes(1) // no INSERT
  })

  it('gives a shared owner row to the first employee only', async () => {
    const shared = { ...UNLINKED_ROW, id: 'shared-row' }
    mockQueries(
      [shared], // match for the first co-owner
      [], // UPDATE owners
      [{ id: 'spot-18', owner_id: 'shared-row' }], // spot already correct
      [shared], // match for the second co-owner — same row
    )

    const summary = await syncOwnersFromTimesheet([
      employee({ user_id: 6, name: 'Iztok Kavkler', parking_spot: 'K1-18' }),
      employee({ user_id: 555, name: 'Jan Grošelj', parking_spot: 'K1-18' }),
    ])

    expect(summary.updated).toBe(1)
    expect(summary.unmatched).toEqual([
      'Jan Grošelj (owner row already claimed)',
    ])
  })

  it('keeps going when one employee fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('boom'))
    mockQueries([UNLINKED_ROW], [], [{ id: 'spot-2', owner_id: 'owner-1' }])

    const summary = await syncOwnersFromTimesheet([
      employee(),
      employee({ user_id: 3, name: 'Boris Horvat', parking_spot: 'K1-26' }),
    ])

    expect(summary.updated).toBe(1)
  })

  it('stores null rather than empty strings, and skips the spot step', async () => {
    mockQueries([UNLINKED_ROW], [])

    await syncOwnersFromTimesheet([
      employee({ email: null, parking_spot: null }),
    ])

    expect(mockQuery.mock.calls[1]![1]).toEqual([11, null, null, 'owner-1'])
    expect(mockQuery).toHaveBeenCalledTimes(2) // no spot lookup without a label
  })
})
