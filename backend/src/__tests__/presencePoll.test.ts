import { describe, expect, it, vi } from 'vitest'

import type {
  EmployeeWeekPresence,
  WeekPresenceResponse,
} from '../lib/presence.types.js'

// Importing the pure fingerprints pulls in ownerSync → db/pool, which needs a URL.
vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))

const { availabilityFingerprint } = await import('../lib/presencePoll.js')

// This fingerprint decides whether every connected client gets told to re-fetch, so it
// must react to what they render and ignore everything else.

function employee(
  over: Partial<EmployeeWeekPresence> = {},
): EmployeeWeekPresence {
  return {
    user_id: 11,
    name: 'Marko Boben',
    email: 'marko.boben@abelium.com',
    parking_spot: 'K1-25',
    week: [
      {
        date: '2026-08-04',
        status: 'in_office',
        is_work_free_day: false,
        parking_available: false,
      },
    ],
    ...over,
  }
}

function presence(
  employees: EmployeeWeekPresence[],
  work_free_days: string[] = [],
): WeekPresenceResponse {
  return { employees, work_free_days }
}

describe('availabilityFingerprint', () => {
  it('is stable across employee ordering', () => {
    const a = employee()
    const b = employee({ user_id: 3, name: 'Boris Horvat' })

    expect(availabilityFingerprint(presence([a, b]))).toBe(
      availabilityFingerprint(presence([b, a])),
    )
  })

  it('changes when a day frees up', () => {
    const before = availabilityFingerprint(presence([employee()]))
    const after = availabilityFingerprint(
      presence([
        employee({
          week: [
            {
              date: '2026-08-04',
              status: 'vacation',
              is_work_free_day: false,
              parking_available: true,
            },
          ],
        }),
      ]),
    )

    expect(after).not.toBe(before)
  })

  it('changes when a holiday is added', () => {
    expect(
      availabilityFingerprint(presence([employee()], ['2026-08-15'])),
    ).not.toBe(availabilityFingerprint(presence([employee()])))
  })

  it('ignores the leave reason — only parking availability matters', () => {
    // in_office -> remote but the spot stays occupied: nothing to broadcast.
    const remote = employee({
      week: [
        {
          date: '2026-08-04',
          status: 'remote',
          is_work_free_day: false,
          parking_available: false,
        },
      ],
    })

    expect(availabilityFingerprint(presence([remote]))).toBe(
      availabilityFingerprint(presence([employee()])),
    )
  })

  // Email/spot changes are the owner sync's business; it reports its own
  // reassignments, and the poller broadcasts on those separately.
  it('ignores email and spot changes', () => {
    expect(
      availabilityFingerprint(
        presence([employee({ email: 'new@acex.si', parking_spot: 'K1-99' })]),
      ),
    ).toBe(availabilityFingerprint(presence([employee()])))
  })
})
