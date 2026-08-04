import { describe, expect, it, vi } from 'vitest'

import type {
  EmployeeWeekPresence,
  WeekPresenceResponse,
} from '../lib/presence.types.js'

// The fingerprints are pure, but importing them pulls in ownerSync → db/pool,
// which refuses to load without DATABASE_URL.
vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))

const { availabilityFingerprint, identityFingerprint } =
  await import('../lib/presencePoll.js')

// The fingerprints decide whether a poll broadcasts to every connected client
// (availability) and whether it writes to the owners table (identity), so each
// must react to exactly the fields it covers and ignore the rest.

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
    // status flips in_office -> remote but the spot stays occupied: clients
    // render nothing differently, so no broadcast should be triggered.
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

  it('ignores email and spot changes — those are the identity sync', () => {
    expect(
      availabilityFingerprint(
        presence([employee({ email: 'new@acex.si', parking_spot: 'K1-99' })]),
      ),
    ).toBe(availabilityFingerprint(presence([employee()])))
  })
})

describe('identityFingerprint', () => {
  it('is stable across employee ordering', () => {
    const a = employee()
    const b = employee({ user_id: 3, name: 'Boris Horvat' })

    expect(identityFingerprint(presence([a, b]))).toBe(
      identityFingerprint(presence([b, a])),
    )
  })

  it('changes when an email or spot changes', () => {
    const base = identityFingerprint(presence([employee()]))

    expect(
      identityFingerprint(presence([employee({ email: 'x@acex.si' })])),
    ).not.toBe(base)
    expect(
      identityFingerprint(presence([employee({ parking_spot: 'K1-99' })])),
    ).not.toBe(base)
  })

  it('ignores day-level availability — that is the broadcast signal', () => {
    const freed = employee({
      week: [
        {
          date: '2026-08-04',
          status: 'vacation',
          is_work_free_day: false,
          parking_available: true,
        },
      ],
    })

    expect(identityFingerprint(presence([freed]))).toBe(
      identityFingerprint(presence([employee()])),
    )
  })
})
