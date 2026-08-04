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

// A row already linked to this employee with the same spot — nothing to write.
const SYNCED_OWNER = {
  id: 'owner-1',
  timesheet_user_id: 11,
  email: 'marko.boben@abelium.com',
  parking_spot: 'K1-25',
  spot_owner: 'owner-1',
}

describe('syncOwnersFromTimesheet', () => {
  it('writes id, email and spot onto a matched but unlinked owner row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'owner-1',
          timesheet_user_id: null,
          email: null,
          parking_spot: null,
          spot_owner: 'owner-1',
        },
      ],
    })
    mockQuery.mockResolvedValueOnce({ rows: [] }) // the UPDATE

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary).toEqual({ updated: 1, unmatched: [], drift: [] })
    const update = mockQuery.mock.calls[1]!
    expect(update[0]).toMatch(/UPDATE owners/)
    expect(update[1]).toEqual([
      11,
      'marko.boben@abelium.com',
      'K1-25',
      'owner-1',
    ])
  })

  it('writes nothing when the owner row is already in sync', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SYNCED_OWNER] })

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.updated).toBe(0)
    expect(mockQuery).toHaveBeenCalledTimes(1) // match only, no UPDATE
  })

  it('updates when only the spot changed (employee moved)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...SYNCED_OWNER, parking_spot: 'K1-99' }],
    })
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.updated).toBe(1)
    expect(mockQuery.mock.calls[1]![1]).toContain('K1-25')
  })

  it('reports an employee with no owner row instead of creating one', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const summary = await syncOwnersFromTimesheet([
      employee({ user_id: 99, name: 'Borut Mrak', parking_spot: 'K1-9' }),
    ])

    expect(summary.updated).toBe(0)
    expect(summary.unmatched).toEqual(['Borut Mrak (K1-9)'])
    expect(mockQuery).toHaveBeenCalledTimes(1) // no INSERT
  })

  it('reports drift when the timesheet spot is unassigned in ParkFlow', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...SYNCED_OWNER, spot_owner: null }],
    })

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.drift).toEqual([
      'Marko Boben: K1-25 is unassigned in ParkFlow',
    ])
  })

  it('reports drift when the timesheet spot belongs to another owner row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...SYNCED_OWNER, spot_owner: 'someone-else' }],
    })

    const summary = await syncOwnersFromTimesheet([employee()])

    expect(summary.drift).toEqual([
      'Marko Boben: K1-25 belongs to another owner',
    ])
  })

  it('keeps going when one employee fails (e.g. duplicate id rejected)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('unique violation'))
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'owner-2',
          timesheet_user_id: null,
          email: null,
          parking_spot: null,
          spot_owner: 'owner-2',
        },
      ],
    })
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const summary = await syncOwnersFromTimesheet([
      employee(),
      employee({ user_id: 3, name: 'Boris Horvat', parking_spot: 'K1-26' }),
    ])

    expect(summary.updated).toBe(1)
  })

  it('gives a shared owner row to the first employee only', async () => {
    // Both co-owners match the one row by name; the second must not overwrite.
    const sharedRow = {
      id: 'shared-row',
      timesheet_user_id: null,
      email: null,
      parking_spot: null,
      spot_owner: 'shared-row',
    }
    mockQuery.mockResolvedValueOnce({ rows: [sharedRow] })
    mockQuery.mockResolvedValueOnce({ rows: [] }) // UPDATE for the first
    mockQuery.mockResolvedValueOnce({ rows: [sharedRow] }) // same row again

    const summary = await syncOwnersFromTimesheet([
      employee({ user_id: 6, name: 'Iztok Kavkler', parking_spot: 'K1-18' }),
      employee({ user_id: 555, name: 'Jan Grošelj', parking_spot: 'K1-18' }),
    ])

    expect(summary.updated).toBe(1)
    expect(summary.unmatched).toEqual([
      'Jan Grošelj (owner row already claimed)',
    ])
    // 3 calls: match, update, match — never a second update.
    expect(mockQuery).toHaveBeenCalledTimes(3)
    expect(mockQuery.mock.calls[1]![1]).toEqual([
      6,
      'marko.boben@abelium.com',
      'K1-18',
      'shared-row',
    ])
  })

  it('stores null rather than empty strings for a missing email or spot', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'owner-3',
          timesheet_user_id: null,
          email: null,
          parking_spot: null,
          spot_owner: null,
        },
      ],
    })
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await syncOwnersFromTimesheet([
      employee({ email: null, parking_spot: null }),
    ])

    expect(mockQuery.mock.calls[1]![1]).toEqual([11, null, null, 'owner-3'])
  })
})
