import type { Server } from 'node:http'

import request from 'supertest'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { createApp } from '../app.js'
import {
  activeBookingOnDate,
  type BookingLike,
  dayLabel,
  dedupeSpotsForDate,
  formatCancelResult,
  formatFreeSpots,
  formatFreeSpotsByBuilding,
  formatHistory,
  formatOccupancy,
  formatOwners,
  formatPeakHours,
  formatReserveResult,
  formatStatus,
  HELP_TEXT,
  isGrabbable,
  ljubljanaInstant,
  localDate,
  parseCommand,
  parseDate,
  pickRandomFree,
  resolveLot,
  selectCancelTarget,
  spotLink,
  spotStatusOnDate,
  workDayOver,
} from '../routes/integrations.js'

vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

// Stub the timesheet fetch so the `owners` loopback test (which hits
// /api/presence) doesn't make a real external call. This only affects the
// presence route; the pure-function status tests inject their own presence
// resolver, so they're unaffected.
vi.mock('../lib/presence.js', () => ({
  fetchWeekPresence: vi.fn().mockResolvedValue({
    employees: [],
    work_free_days: [],
  }),
  isOwnerAbsent: vi.fn().mockReturnValue(false),
}))

const { pool } = await import('../db/pool.js')
const mockQuery = pool.query as ReturnType<typeof vi.fn>

const WEBHOOK_TOKEN = 'rc-shared-secret'
const NOW = new Date('2026-06-01T09:00:00.000Z')

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
})

// Some loopback tests freeze Date (see pinClock) — always restore. No-op when
// timers were never faked.
afterEach(() => {
  vi.useRealTimers()
})

// Pin the route's `new Date()` inside working hours. Tests that reserve "today"
// hit the workDayOver guard ("No working time left today") when the suite runs
// after 17:00 Ljubljana time — exactly what happens in evening CI runs. Only
// Date is faked so supertest/loopback timers keep working.
function pinClock() {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
}

// --- parseCommand -----------------------------------------------------------

describe('parseCommand', () => {
  it('maps help / info / ?', () => {
    expect(parseCommand('help').command).toBe('help')
    expect(parseCommand('info').command).toBe('help')
    expect(parseCommand('?').command).toBe('help')
  })

  it('maps status and me', () => {
    expect(parseCommand('status').command).toBe('status')
    expect(parseCommand('me').command).toBe('status')
  })

  it('treats "free spots" / "spots" / "available" / bare "free" as the list command', () => {
    expect(parseCommand('free spots')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('spots')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('available')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('free')).toEqual({ command: 'spots', rest: [] })
  })

  it('treats "free spaces" / "spaces" as aliases of the list command', () => {
    expect(parseCommand('free spaces')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('free space')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('spaces')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('free spaces klet1')).toEqual({
      command: 'spots',
      rest: ['klet1'],
    })
  })

  it('keeps a building filter as rest for the list command', () => {
    expect(parseCommand('free spots zunaj')).toEqual({
      command: 'spots',
      rest: ['zunaj'],
    })
    expect(parseCommand('spots klet1')).toEqual({
      command: 'spots',
      rest: ['klet1'],
    })
  })

  it('treats "free spot" / "free spots" as listing free spots', () => {
    expect(parseCommand('free spot')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('free spots')).toEqual({ command: 'spots', rest: [] })
    expect(parseCommand('free spots klet1')).toEqual({
      command: 'spots',
      rest: ['klet1'],
    })
  })

  it('maps reserve / book with arguments', () => {
    expect(parseCommand('reserve A12')).toEqual({
      command: 'reserve',
      rest: ['A12'],
    })
    expect(parseCommand('book A12 tomorrow')).toEqual({
      command: 'reserve',
      rest: ['A12', 'tomorrow'],
    })
  })

  it('maps cancel and consumes an optional "reservation" word', () => {
    expect(parseCommand('cancel')).toEqual({ command: 'cancel', rest: [] })
    expect(parseCommand('cancel reservation')).toEqual({
      command: 'cancel',
      rest: [],
    })
    expect(parseCommand('cancel A12')).toEqual({
      command: 'cancel',
      rest: ['A12'],
    })
  })

  it('maps history / log', () => {
    expect(parseCommand('history').command).toBe('history')
    expect(parseCommand('log').command).toBe('history')
  })

  it('maps the map / where command with an optional argument', () => {
    expect(parseCommand('map')).toEqual({ command: 'map', rest: [] })
    expect(parseCommand('where Z-3')).toEqual({
      command: 'map',
      rest: ['Z-3'],
    })
  })

  it('maps owners (exact word only — no aliases) and keeps building/date args', () => {
    expect(parseCommand('owners')).toEqual({ command: 'owners', rest: [] })
    expect(parseCommand('owners tomorrow')).toEqual({
      command: 'owners',
      rest: ['tomorrow'],
    })
    expect(parseCommand('owners klet1 tomorrow')).toEqual({
      command: 'owners',
      rest: ['klet1', 'tomorrow'],
    })
    // Near-misses must NOT trigger the roster.
    expect(parseCommand('owner').command).toBe('unknown')
    expect(parseCommand('who').command).toBe('unknown')
    expect(parseCommand('whose').command).toBe('unknown')
  })

  it('maps stats (only — no occupancy alias) with optional args', () => {
    expect(parseCommand('stats')).toEqual({ command: 'stats', rest: [] })
    expect(parseCommand('stats klet1')).toEqual({
      command: 'stats',
      rest: ['klet1'],
    })
    expect(parseCommand('occupancy').command).toBe('unknown')
  })

  it('maps "peak hours" (only that phrase) with an optional building', () => {
    expect(parseCommand('peak hours')).toEqual({
      command: 'peak-hours',
      rest: [],
    })
    expect(parseCommand('peak hours zunaj')).toEqual({
      command: 'peak-hours',
      rest: ['zunaj'],
    })
    // "peak" or "busy" alone are not commands.
    expect(parseCommand('peak').command).toBe('unknown')
    expect(parseCommand('busy').command).toBe('unknown')
  })

  it('returns unknown for unrecognised or empty input', () => {
    expect(parseCommand('blabla').command).toBe('unknown')
    expect(parseCommand('').command).toBe('unknown')
  })

  it('recognises greetings (SI + EN)', () => {
    for (const g of ['hej', 'hi', 'živjo', 'zivjo', 'servus', 'sergus']) {
      expect(parseCommand(g).command).toBe('greet')
    }
  })
})

// --- parseDate --------------------------------------------------------------

describe('parseDate', () => {
  it('defaults to today when no token is given', () => {
    expect(parseDate(undefined, NOW)).toBe('2026-06-01')
  })

  it('understands today and tomorrow', () => {
    expect(parseDate('today', NOW)).toBe('2026-06-01')
    expect(parseDate('tomorrow', NOW)).toBe('2026-06-02')
  })

  it('resolves today in Slovenian local time, not UTC', () => {
    // 23:30 UTC on 2026-06-01 is already 01:30 on 2026-06-02 in Ljubljana.
    const late = new Date('2026-06-01T23:30:00.000Z')
    expect(parseDate('today', late)).toBe('2026-06-02')
    expect(parseDate('tomorrow', late)).toBe('2026-06-03')
  })

  it('parses dd.mm.yyyy', () => {
    expect(parseDate('03.06.2026', NOW)).toBe('2026-06-03')
  })

  it('accepts single-digit day and month', () => {
    expect(parseDate('2.6.2026', NOW)).toBe('2026-06-02')
    expect(parseDate('2.6.2026', NOW)).toBe(parseDate('02.06.2026', NOW))
  })

  it('returns null for an impossible or malformed date', () => {
    expect(parseDate('32.13.2026', NOW)).toBeNull()
    expect(parseDate('please', NOW)).toBeNull()
    expect(parseDate('3-6-2026', NOW)).toBeNull()
  })
})

// --- dedupeSpotsForDate -----------------------------------------------------

describe('dedupeSpotsForDate', () => {
  const DATE = '2026-06-01'

  it('collapses multiple booking rows for one spot into a single row', () => {
    // A pool spot returned twice by /api/spots: once per active booking.
    const spots = [
      {
        id: 's1',
        number: 3,
        label: 'Z-3',
        status: 'free',
        active_booking_id: 'bToday',
        active_booking_expires_at: `${DATE}T15:00:00.000Z`,
      },
      {
        id: 's1',
        number: 3,
        label: 'Z-3',
        status: 'free',
        active_booking_id: 'bTomorrow',
        active_booking_expires_at: '2026-06-02T15:00:00.000Z',
      },
    ]
    const out = dedupeSpotsForDate(spots, DATE)
    expect(out).toHaveLength(1)
    // Keeps the row whose booking is on the target date.
    expect(out[0]!.active_booking_id).toBe('bToday')
  })

  it('keeps distinct spots and rows without an id', () => {
    const spots = [
      { id: 's1', number: 1, label: 'Z-1', status: 'free' },
      { id: 's2', number: 2, label: 'Z-2', status: 'occupied' },
      { number: 3, label: 'Z-3', status: 'free' }, // no id
    ]
    expect(dedupeSpotsForDate(spots, DATE)).toHaveLength(3)
  })
})

// --- dayLabel ---------------------------------------------------------------

describe('dayLabel', () => {
  it('labels today and tomorrow relative to now', () => {
    expect(dayLabel('2026-06-01', NOW)).toBe('today')
    expect(dayLabel('2026-06-02', NOW)).toBe('tomorrow')
  })

  it('falls back to DD.MM.YYYY for any other date', () => {
    expect(dayLabel('2026-06-05', NOW)).toBe('05.06.2026')
  })
})

// --- ljubljanaInstant -------------------------------------------------------

describe('ljubljanaInstant', () => {
  it('maps 09:00/17:00 local to UTC in summer (CEST = UTC+2)', () => {
    expect(ljubljanaInstant('2026-06-01', 9)).toBe('2026-06-01T07:00:00.000Z')
    expect(ljubljanaInstant('2026-06-01', 17)).toBe('2026-06-01T15:00:00.000Z')
  })

  it('maps 09:00/17:00 local to UTC in winter (CET = UTC+1)', () => {
    expect(ljubljanaInstant('2026-01-15', 9)).toBe('2026-01-15T08:00:00.000Z')
    expect(ljubljanaInstant('2026-01-15', 17)).toBe('2026-01-15T16:00:00.000Z')
  })
})

// --- workDayOver ------------------------------------------------------------

describe('workDayOver', () => {
  it('is false during working hours today', () => {
    // 09:00 UTC = 11:00 Ljubljana (summer) — still within the day.
    expect(
      workDayOver('2026-06-01', new Date('2026-06-01T09:00:00.000Z')),
    ).toBe(false)
  })

  it('is true once today is past 17:00 local', () => {
    // 20:00 UTC = 22:00 Ljubljana (summer) — working day is over.
    expect(
      workDayOver('2026-06-01', new Date('2026-06-01T20:00:00.000Z')),
    ).toBe(true)
  })

  it('is false for a future date regardless of the current time', () => {
    expect(
      workDayOver('2026-06-02', new Date('2026-06-01T20:00:00.000Z')),
    ).toBe(false)
  })
})

// --- activeBookingOnDate ----------------------------------------------------

describe('activeBookingOnDate', () => {
  it('finds an active booking on the given date, ignoring cancelled', () => {
    const bookings = [
      {
        status: 'active',
        spot_label: 'Z-3',
        spot_number: 3,
        expires_at: '2026-06-01T15:00:00.000Z',
      },
      {
        status: 'cancelled',
        spot_label: 'Z-4',
        spot_number: 4,
        expires_at: '2026-06-01T15:00:00.000Z',
      },
    ]
    expect(activeBookingOnDate(bookings, '2026-06-01')?.spot_label).toBe('Z-3')
    expect(activeBookingOnDate(bookings, '2026-06-02')).toBeUndefined()
  })
})

// --- resolveLot -------------------------------------------------------------

const LOTS = [
  { id: 'l1', name: 'Zunanje parkirišče' },
  { id: 'l2', name: 'Klet -1' },
  { id: 'l3', name: 'Klet -2' },
]

describe('resolveLot', () => {
  it('resolves outside aliases', () => {
    expect(resolveLot('zunaj', LOTS)?.id).toBe('l1')
    expect(resolveLot('outside', LOTS)?.id).toBe('l1')
  })

  it('resolves basement aliases', () => {
    expect(resolveLot('klet1', LOTS)?.id).toBe('l2')
    expect(resolveLot('-1', LOTS)?.id).toBe('l2')
    expect(resolveLot('b2', LOTS)?.id).toBe('l3')
  })

  it('returns undefined for an unknown building', () => {
    expect(resolveLot('garage', LOTS)).toBeUndefined()
  })
})

describe('pickRandomFree', () => {
  it('picks a free spot (skipping occupied ones)', () => {
    const spots = [
      { number: 1, label: 'Z-1', status: 'occupied' },
      { number: 2, label: 'Z-2', status: 'free' },
      { number: 3, label: 'Z-3', status: 'free' },
    ]
    expect(pickRandomFree(spots, () => 0)?.label).toBe('Z-2')
    expect(pickRandomFree(spots, () => 0.99)?.label).toBe('Z-3')
  })

  it('returns undefined when nothing is free', () => {
    expect(
      pickRandomFree([{ number: 1, label: 'Z-1', status: 'occupied' }]),
    ).toBeUndefined()
  })
})

describe('spotLink', () => {
  it('builds a public map deep-link for a spot id', () => {
    expect(spotLink('abc-123')).toBe('http://localhost:3000/?spot=abc-123')
  })
})

describe('isGrabbable', () => {
  it('allows free unowned and ACEX spots, rejects personal/occupied', () => {
    expect(
      isGrabbable({ number: 1, label: 'A', status: 'free', owner_id: null }),
    ).toBe(true)
    expect(
      isGrabbable({
        number: 2,
        label: 'B',
        status: 'free',
        owner_id: 'o1',
        owner_name: 'ACEX - kdor prej pride, prej melje',
      }),
    ).toBe(true)
    expect(
      isGrabbable({
        number: 3,
        label: 'C',
        status: 'free',
        owner_id: 'o2',
        owner_name: 'Maja',
      }),
    ).toBe(false)
    expect(
      isGrabbable({
        number: 4,
        label: 'D',
        status: 'occupied',
        owner_id: null,
      }),
    ).toBe(false)
  })
})

// --- formatters -------------------------------------------------------------

describe('formatFreeSpots', () => {
  // The caller pre-filters to available spots; the formatter just lists them
  // and stamps the day label.
  it('lists the given spots by label with the day label', () => {
    expect(
      formatFreeSpots(
        [
          { number: 12, label: 'A12', status: 'free' },
          { number: 9, label: 'C09', status: 'free' },
        ],
        'tomorrow',
      ),
    ).toBe('Free spots *(2)* — tomorrow: A12, C09')
  })

  it('reports when there are no free spots for the day', () => {
    expect(formatFreeSpots([], 'today')).toBe('No free spots for today.')
  })
})

describe('formatFreeSpotsByBuilding', () => {
  it('groups the given spots under their building in lot order', () => {
    const spots = [
      { number: 3, label: 'Z-3', status: 'free', lot_id: 'l1' },
      { number: 23, label: 'K1-23', status: 'free', lot_id: 'l2' },
    ]
    expect(formatFreeSpotsByBuilding(spots, LOTS, 'tomorrow')).toBe(
      'Free spots *(2)* — tomorrow:\n• Zunanje parkirišče *(1)*: Z-3\n• Klet -1 *(1)*: K1-23',
    )
  })

  it('buckets spots with no matching lot under Other', () => {
    const spots = [
      { number: 3, label: 'Z-3', status: 'free', lot_id: 'l1' },
      { number: 99, label: 'X-99', status: 'free', lot_id: 'lx' },
    ]
    expect(formatFreeSpotsByBuilding(spots, LOTS, 'today')).toBe(
      'Free spots *(2)* — today:\n• Zunanje parkirišče *(1)*: Z-3\n• Other *(1)*: X-99',
    )
  })

  it('reports when there are no free spots for the day', () => {
    expect(formatFreeSpotsByBuilding([], LOTS, 'today')).toBe(
      'No free spots for today.',
    )
  })
})

describe('formatReserveResult', () => {
  it('confirms a successful reservation', () => {
    expect(formatReserveResult(201, {}, 'A12', '2026-06-01')).toBe(
      'Reserved spot A12 for 2026-06-01.',
    )
  })

  it('includes the expiry time (Slovenian time) when provided', () => {
    expect(
      formatReserveResult(
        201,
        { expires_at: '2026-06-01T15:00:00.000Z' },
        'A12',
        '2026-06-01',
      ),
    ).toBe('Reserved spot A12 until 17:00 on 01.06.2026.')
  })

  it('reports an unavailable spot on 409', () => {
    expect(formatReserveResult(409, {}, 'A12', '2026-06-01')).toBe(
      'A12 isn’t available for 2026-06-01. Type "free spots" to see open ones.',
    )
  })
})

describe('formatCancelResult', () => {
  it('confirms a cancellation', () => {
    expect(formatCancelResult(200, 'A12')).toBe(
      'Cancelled your reservation on A12.',
    )
  })
})

describe('selectCancelTarget', () => {
  // Active bookings carry a day via expires_at (same as activeBookingOnDate).
  const today: BookingLike = {
    id: 'bToday',
    spot_number: 12,
    spot_label: 'A12',
    status: 'active',
    expires_at: '2026-06-01T15:00:00.000Z',
  }
  const tomorrow: BookingLike = {
    id: 'bTomorrow',
    spot_number: 5,
    spot_label: 'B05',
    status: 'active',
    expires_at: '2026-06-02T15:00:00.000Z',
  }

  it('targets the single active booking when no token is given', () => {
    expect(selectCancelTarget([today], [], NOW)).toEqual({
      kind: 'target',
      booking: today,
    })
  })

  it('targets the booking on the given day for "cancel today"', () => {
    // The regression: "today" must select today's booking, not be read as a spot.
    expect(selectCancelTarget([today, tomorrow], ['today'], NOW)).toEqual({
      kind: 'target',
      booking: today,
    })
    expect(selectCancelTarget([today, tomorrow], ['tomorrow'], NOW)).toEqual({
      kind: 'target',
      booking: tomorrow,
    })
  })

  it('targets by spot label, case-insensitively', () => {
    expect(selectCancelTarget([today, tomorrow], ['a12'], NOW)).toEqual({
      kind: 'target',
      booking: today,
    })
  })

  it('targets by spot and day together', () => {
    expect(
      selectCancelTarget([today, tomorrow], ['B05', 'tomorrow'], NOW),
    ).toEqual({ kind: 'target', booking: tomorrow })
  })

  it('is ambiguous with multiple active bookings and no filter', () => {
    expect(selectCancelTarget([today, tomorrow], [], NOW)).toEqual({
      kind: 'ambiguous',
      active: [today, tomorrow],
    })
  })

  it('reports none (with the day) when no booking matches the day', () => {
    expect(selectCancelTarget([tomorrow], ['today'], NOW)).toEqual({
      kind: 'none',
      spotName: undefined,
      date: '2026-06-01',
    })
  })

  it('reports none (with the spot) when no booking matches the spot', () => {
    expect(selectCancelTarget([today], ['Z9'], NOW)).toEqual({
      kind: 'none',
      spotName: 'Z9',
      date: undefined,
    })
  })

  it('ignores cancelled bookings', () => {
    const cancelled: BookingLike = { ...today, id: 'x', status: 'cancelled' }
    expect(selectCancelTarget([cancelled], [], NOW)).toEqual({
      kind: 'none',
      spotName: undefined,
      date: undefined,
    })
  })
})

describe('formatStatus', () => {
  it('reports nothing when no reservation and no owned spot', () => {
    expect(formatStatus([], [])).toBe(
      'You have no active reservation and no owned spot.',
    )
  })

  it('reports an active reservation', () => {
    expect(
      formatStatus(
        [{ status: 'active', spot_label: 'A12', spot_number: 12 }],
        [],
      ),
    ).toBe('• You have *A12* reserved.')
  })

  it('includes the expiry time on an active reservation', () => {
    expect(
      formatStatus(
        [
          {
            status: 'active',
            spot_label: 'A12',
            spot_number: 12,
            expires_at: '2026-06-01T15:00:00.000Z',
          },
        ],
        [],
      ),
    ).toBe('• You have *A12* reserved *until 17:00 on 01.06.2026*.')
  })

  it('reports an owned free spot and one in use by a co-owner', () => {
    const owned = [
      {
        label: 'B05',
        number: 5,
        status: 'free',
        active_booking_id: null,
        active_booking_reserved_by: null,
        active_booking_booked_by_owner: false,
      },
      {
        label: 'B06',
        number: 6,
        status: 'reserved',
        active_booking_id: 'bk1',
        active_booking_reserved_by: 'Maja',
        active_booking_booked_by_owner: false,
      },
    ]
    expect(formatStatus([], owned)).toBe(
      '• Your spot B05: free for you today.\n• Your spot B06: in use by Maja today.',
    )
  })
})

describe('formatHistory', () => {
  it('reports when there is no history', () => {
    expect(formatHistory([])).toBe('No booking history yet.')
  })

  it('lists the most recent bookings newest-first, capped at 5', () => {
    const bookings = [
      {
        booked_at: '2026-05-20T08:00:00Z',
        spot_label: 'A1',
        spot_number: 1,
        status: 'cancelled',
      },
      {
        booked_at: '2026-05-28T08:00:00Z',
        spot_label: 'A2',
        spot_number: 2,
        status: 'active',
      },
    ]
    expect(formatHistory(bookings)).toBe(
      'Your last 2 bookings:\n✅ 2026-05-28 — A2\n❌ 2026-05-20 — A1',
    )
  })
})

describe('spotStatusOnDate', () => {
  const DATE = '2026-06-01'
  // Presence resolver stubs (return OwnerPresence literals).
  const away = (): 'absent' => 'absent'
  const present = (): 'in_office' => 'in_office'
  const unknown = (): 'unknown' => 'unknown'
  // Per-name resolver for co-owner cases.
  const byName =
    (m: Record<string, 'in_office' | 'absent' | 'unknown'>) =>
    (name: string): 'in_office' | 'absent' | 'unknown' =>
      m[name] ?? 'unknown'

  const owned = (owner_name: string, extra = {}) => ({
    number: 1,
    label: 'X1',
    status: 'occupied',
    owner_id: 'o',
    owner_name,
    ...extra,
  })

  it('is free when the (only) owner is absent that day', () => {
    expect(spotStatusOnDate(owned('Ana'), DATE, undefined, away)).toBe('free')
  })

  it('is taken when the (single) owner is in office', () => {
    expect(spotStatusOnDate(owned('Ana'), DATE, undefined, present)).toBe(
      'taken',
    )
  })

  it('is unconfirmed when 2+ co-owners may be in office (shared spot)', () => {
    const allIn = byName({
      Ana: 'in_office',
      Boris: 'in_office',
      Cveto: 'in_office',
    })
    expect(
      spotStatusOnDate(owned('Ana / Boris / Cveto'), DATE, undefined, allIn),
    ).toBe('unconfirmed')
  })

  it('is taken (not unconfirmed) when exactly one co-owner is in office', () => {
    const oneIn = byName({ Ana: 'in_office', Boris: 'absent' })
    expect(spotStatusOnDate(owned('Ana / Boris'), DATE, undefined, oneIn)).toBe(
      'taken',
    )
  })

  it('is free when all co-owners are absent', () => {
    const allAway = byName({ Ana: 'absent', Boris: 'absent' })
    expect(
      spotStatusOnDate(owned('Ana / Boris'), DATE, undefined, allAway),
    ).toBe('free')
  })

  it('does not count owners with unknown presence toward the in-office tally', () => {
    // Only one known in-office co-owner (others unknown) → taken, not unconfirmed.
    const oneKnown = byName({ Ana: 'in_office' })
    expect(
      spotStatusOnDate(owned('Ana / Boris / Cveto'), DATE, undefined, oneKnown),
    ).toBe('taken')
  })

  it('lets a per-day override win over presence', () => {
    expect(spotStatusOnDate(owned('Ana'), DATE, 'free', present)).toBe('free')
    expect(spotStatusOnDate(owned('Ana'), DATE, 'occupied', away)).toBe('taken')
  })

  it('counts an active booking for that day as taken, even with a free override', () => {
    expect(
      spotStatusOnDate(
        owned('Ana', {
          active_booking_id: 'b1',
          active_booking_expires_at: `${DATE}T15:00:00.000Z`,
        }),
        DATE,
        'free',
        away,
      ),
    ).toBe('taken')
  })

  it('ignores an active booking that is for a different day', () => {
    expect(
      spotStatusOnDate(
        owned('Ana', {
          active_booking_id: 'b1',
          active_booking_expires_at: '2026-06-02T15:00:00.000Z',
        }),
        DATE,
        undefined,
        away,
      ),
    ).toBe('free')
  })

  it("keeps an ACEX pool spot free by default but respects an admin's non-free status", () => {
    const acex = (status: string) => ({
      number: 1,
      label: 'X1',
      status,
      owner_id: 'acex',
      owner_name: 'ACEX - kdor prej pride, prej melje',
    })
    expect(spotStatusOnDate(acex('free'), DATE, undefined, unknown)).toBe(
      'free',
    )
    expect(spotStatusOnDate(acex('occupied'), DATE, undefined, unknown)).toBe(
      'taken',
    )
    expect(spotStatusOnDate(acex('reserved'), DATE, undefined, unknown)).toBe(
      'taken',
    )
  })

  it('falls back to the stored status when presence is unknown', () => {
    expect(spotStatusOnDate(owned('Ana'), DATE, undefined, unknown)).toBe(
      'taken',
    )
    expect(
      spotStatusOnDate(
        owned('Ana', { status: 'free' }),
        DATE,
        undefined,
        unknown,
      ),
    ).toBe('free')
  })
})

describe('formatOwners', () => {
  // Status by base status (enough to exercise icon rendering; the status rule
  // itself is covered above). free→🟩, anything else→🟥.
  const byStatus = (s: { status: string }): 'free' | 'taken' =>
    s.status === 'free' ? 'free' : 'taken'

  it('groups owned spots by owner with a per-spot availability icon', () => {
    const spots = [
      {
        number: 12,
        label: 'A12',
        status: 'occupied',
        lot_id: 'l1',
        owner_id: 'o1',
        owner_name: 'Janez Novak',
      },
      {
        number: 13,
        label: 'A13',
        status: 'free',
        lot_id: 'l1',
        owner_id: 'o1',
        owner_name: 'Janez Novak',
      },
      {
        number: 23,
        label: 'K1-23',
        status: 'occupied',
        lot_id: 'l2',
        owner_id: 'o2',
        owner_name: 'Mojca Kovač',
      },
    ]
    expect(formatOwners(spots, LOTS, byStatus, 'today')).toBe(
      'Parking spot owners (2) — today:\n' +
        '• Janez Novak — A12 🟥, A13 🟩 (Zunanje parkirišče)\n' +
        '• Mojca Kovač — K1-23 🟥 (Klet -1)',
    )
  })

  it('shows only ACEX employees — skips unowned, the public pool, placeholders and external rentals', () => {
    const spots = [
      { number: 1, label: 'Z-1', status: 'free', owner_id: null },
      {
        number: 2,
        label: 'Z-2',
        status: 'free',
        lot_id: 'l1',
        owner_id: 'acex',
        owner_name: 'ACEX - kdor prej pride, prej melje',
      },
      {
        number: 13,
        label: 'K1-13',
        status: 'occupied',
        lot_id: 'l2',
        owner_id: 'tesla',
        owner_name: 'Tesla S',
      },
      {
        number: 16,
        label: 'K1-16',
        status: 'occupied',
        lot_id: 'l2',
        owner_id: 'mik',
        owner_name: 'oddano v najem: MIK',
      },
      {
        number: 43,
        label: 'K2-43',
        status: 'occupied',
        lot_id: 'l2',
        owner_id: 'rdx',
        owner_name: 'Reduxi',
      },
      {
        number: 3,
        label: 'Z-3',
        status: 'occupied',
        lot_id: 'l1',
        owner_id: 'o1',
        owner_name: 'Ana Horvat',
      },
    ]
    expect(formatOwners(spots, LOTS, byStatus, 'tomorrow')).toBe(
      'Parking spot owners (1) — tomorrow:\n• Ana Horvat — Z-3 🟥 (Zunanje parkirišče)',
    )
  })

  it('names the building in the header and drops the per-owner suffix when filtered', () => {
    // Caller has already scoped spots to the building; we pass its name.
    const spots = [
      {
        number: 23,
        label: 'K1-23',
        status: 'occupied',
        lot_id: 'l2',
        owner_id: 'o2',
        owner_name: 'Mojca Kovač',
      },
    ]
    expect(formatOwners(spots, LOTS, byStatus, 'today', 'Klet -1')).toBe(
      'Parking spot owners in Klet -1 (1) — today:\n• Mojca Kovač — K1-23 🟥',
    )
  })

  it('reports an empty building scope with the building name', () => {
    expect(formatOwners([], LOTS, byStatus, 'today', 'Klet -2')).toBe(
      'No assigned parking spots in Klet -2.',
    )
  })

  it('renders the unconfirmed icon for a shared spot', () => {
    const spots = [
      {
        number: 56,
        label: 'K2-56',
        status: 'unconfirmed',
        lot_id: 'l3',
        owner_id: 'o3',
        owner_name: 'Tilen Marc / Demijan Lesjak / Timotej Vesel',
      },
    ]
    const statusOf = () => 'unconfirmed' as const
    expect(formatOwners(spots, LOTS, statusOf, 'today')).toBe(
      'Parking spot owners (1) — today:\n' +
        '• Tilen Marc / Demijan Lesjak / Timotej Vesel — K2-56 🟪 (Klet -2)',
    )
  })

  it('reports when no spot has an assigned owner', () => {
    expect(
      formatOwners(
        [{ number: 1, label: 'Z-1', status: 'free', owner_id: null }],
        LOTS,
        byStatus,
        'today',
      ),
    ).toBe('No parking spots have an assigned owner.')
  })
})

describe('formatOccupancy', () => {
  const allFree = () => 'free' as const
  const byStatus = (s: { status: string }): 'free' | 'taken' =>
    s.status === 'free' ? 'free' : 'taken'

  it('reports overall and per-building occupancy', () => {
    const spots = [
      { number: 1, label: 'Z-1', status: 'free', lot_id: 'l1' },
      { number: 2, label: 'Z-2', status: 'occupied', lot_id: 'l1' },
      { number: 3, label: 'K1-1', status: 'occupied', lot_id: 'l2' },
      { number: 4, label: 'K1-2', status: 'free', lot_id: 'l2' },
    ]
    expect(formatOccupancy(spots, LOTS, byStatus, 'today')).toBe(
      'Parking occupancy — today:\n' +
        '• Overall: *50%* full — 2 of 4 free\n' +
        '• Zunanje parkirišče: *50%* full (1/2 free)\n' +
        '• Klet -1: *50%* full (1/2 free)',
    )
  })

  it('reports a single figure when scoped to a building', () => {
    const spots = [
      { number: 3, label: 'K1-1', status: 'occupied', lot_id: 'l2' },
      { number: 4, label: 'K1-2', status: 'free', lot_id: 'l2' },
    ]
    expect(formatOccupancy(spots, LOTS, byStatus, 'today', 'Klet -1')).toBe(
      'Parking occupancy in Klet -1 — today:\n• *50%* full — 1 of 2 free',
    )
  })

  it('reports empty scopes', () => {
    expect(formatOccupancy([], LOTS, allFree, 'today')).toBe(
      'No parking spots found.',
    )
    expect(formatOccupancy([], LOTS, allFree, 'today', 'Klet -2')).toBe(
      'No parking spots in Klet -2.',
    )
  })
})

describe('formatPeakHours', () => {
  it('summarises peak bucket, busiest day and busiest hour', () => {
    const heatmap = [
      { weekday: 2, hour: 9, count: 40 }, // Tuesday 09:00 — the peak bucket
      { weekday: 2, hour: 8, count: 30 },
      { weekday: 1, hour: 9, count: 20 },
      { weekday: 5, hour: 15, count: 5 },
    ]
    expect(formatPeakHours(heatmap)).toBe(
      'Busiest parking times — last 90 days:\n' +
        '• Peak: Tuesday around 09:00\n' +
        '• Busiest day: Tuesday\n' +
        '• Busiest hour: 09:00–10:00',
    )
  })

  it('names the building when scoped', () => {
    const heatmap = [{ weekday: 3, hour: 10, count: 7 }]
    expect(formatPeakHours(heatmap, 'Klet -1')).toBe(
      'Busiest parking times — last 90 days · Klet -1:\n' +
        '• Peak: Wednesday around 10:00\n' +
        '• Busiest day: Wednesday\n' +
        '• Busiest hour: 10:00–11:00',
    )
  })

  it('reports when there is no history', () => {
    expect(formatPeakHours([])).toBe('No historical parking data yet.')
    expect(
      formatPeakHours([{ weekday: 1, hour: 9, count: 0 }], 'Klet -2'),
    ).toBe('No historical parking data yet for Klet -2.')
  })
})

// --- Route: auth + help -----------------------------------------------------

const app = createApp()

describe('POST /api/integrations/rocketchat (auth + help)', () => {
  it('returns 500 when the webhook token is not configured', async () => {
    delete process.env.ROCKETCHAT_WEBHOOK_TOKEN
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: 'x', user_name: 'jsernec', text: 'help' })
    expect(res.status).toBe(500)
  })

  it('returns 401 when the token does not match', async () => {
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: 'wrong', user_name: 'jsernec', text: 'help' })
    expect(res.status).toBe(401)
  })

  it('returns help text for the help command', async () => {
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'help' })
    expect(res.status).toBe(200)
    expect(res.body.text).toBe(HELP_TEXT)
  })

  it('returns a friendly message + help for an unknown command', async () => {
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'blabla' })
    expect(res.status).toBe(200)
    expect(res.body.text).toContain('didn’t catch')
    expect(res.body.text).toContain('reserve')
  })

  it('returns a map link for the map command', async () => {
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'map' })
    expect(res.status).toBe(200)
    expect(res.body.text).toMatch(/https?:\/\//)
  })

  it('greets back on a greeting', async () => {
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'hej' })
    expect(res.status).toBe(200)
    expect(res.body.text).toContain('ParkFlowBot')
  })

  it('rejects reserve with a missing spot (usage hint, no API call)', async () => {
    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'reserve' })
    expect(res.status).toBe(200)
    expect(res.body.text.toLowerCase()).toContain('which spot')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects reserve with an invalid date (no API call)', async () => {
    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'reserve A12 32.13.2026',
    })
    expect(res.status).toBe(200)
    expect(res.body.text.toLowerCase()).toContain('date')
    expect(mockQuery).not.toHaveBeenCalled()
  })
})

// --- Route: loopback end-to-end --------------------------------------------

describe('POST /api/integrations/rocketchat (loopback)', () => {
  let server: Server

  beforeAll(async () => {
    server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    process.env.INTERNAL_API_BASE_URL = `http://127.0.0.1:${port}`
  })

  afterAll(() => {
    server.close()
    delete process.env.INTERNAL_API_BASE_URL
  })

  // The `spots` command fires /api/spots, /api/lots, /api/spots/day-overrides
  // and /api/presence concurrently (order not guaranteed), so route the mock by
  // SQL rather than by call sequence. /api/presence is served by the stubbed
  // fetchWeekPresence (empty roster). Return plain result objects (await unwraps
  // them) to satisfy the lint rule against promise-returning mock callbacks.
  const mockSpotsSources = (
    spots: Array<Record<string, unknown>>,
    lots: Array<{ id: string; name: string }>,
  ): void => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('spot_day_status')) return { rows: [] }
      if (sql.includes('parking_lots')) return { rows: lots }
      return { rows: spots }
    })
  }

  it('lists free spots grouped by building (today) via loopback', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockSpotsSources(
      [
        {
          id: 's1',
          number: 12,
          label: 'A12',
          status: 'free',
          lot_id: 'l1',
          owner_id: null,
        },
        {
          id: 's2',
          number: 4,
          label: 'B04',
          status: 'occupied',
          lot_id: 'l1',
          owner_id: null,
        },
      ],
      [{ id: 'l1', name: 'Zunanje parkirišče' }],
    )

    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'free spots' })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('A12')
    expect(res.body.text).toContain('Zunanje parkirišče')
    // Bare "free spots" === today; the occupied spot is excluded.
    expect(res.body.text).toContain('— today:')
    expect(res.body.text).not.toContain('B04')
  })

  it('lists free spots for a future date (free spots tomorrow)', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockSpotsSources(
      [
        {
          id: 's1',
          number: 12,
          label: 'A12',
          status: 'free',
          lot_id: 'l1',
          owner_id: null,
        },
      ],
      [{ id: 'l1', name: 'Zunanje parkirišče' }],
    )

    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'free spots tomorrow',
    })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('— tomorrow:')
    expect(res.body.text).toContain('A12')
  })

  it('accepts a building + date in either token order', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockSpotsSources(
      [
        {
          id: 's3',
          number: 23,
          label: 'K1-23',
          status: 'free',
          lot_id: 'l2',
          owner_id: null,
        },
      ],
      [
        { id: 'l1', name: 'Zunanje parkirišče' },
        { id: 'l2', name: 'Klet -1' },
        { id: 'l3', name: 'Klet -2' },
      ],
    )

    for (const text of [
      'free spots klet1 tomorrow',
      'free spots tomorrow klet1',
    ]) {
      const res = await request(app)
        .post('/api/integrations/rocketchat')
        .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text })
      expect(res.status).toBe(200)
      expect(res.body.text).toContain('Klet -1')
      expect(res.body.text).toContain('K1-23')
      expect(res.body.text).toContain('tomorrow')
    }
  })

  it('rejects a token that is neither a date nor a building', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockSpotsSources(
      [],
      [
        { id: 'l1', name: 'Zunanje parkirišče' },
        { id: 'l2', name: 'Klet -1' },
      ],
    )

    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'free spots garage',
    })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('garage')
    expect(res.body.text.toLowerCase()).toContain('klet1')
  })

  it('warns that the list may be incomplete when presence is unavailable', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    const { fetchWeekPresence } = await import('../lib/presence.js')
    ;(fetchWeekPresence as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('timesheet down'),
    )
    // The presence route 500s on that rejection; silence the expected log so
    // the test output stays pristine.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSpotsSources(
      [
        {
          id: 's1',
          number: 12,
          label: 'A12',
          status: 'free',
          lot_id: 'l1',
          owner_id: null,
        },
      ],
      [{ id: 'l1', name: 'Zunanje parkirišče' }],
    )

    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'free spots tomorrow',
    })

    expect(res.status).toBe(200)
    expect(res.body.text.toLowerCase()).toContain('may be incomplete')
    errSpy.mockRestore()
  })

  it('lists spot owners with an availability icon via loopback', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    // The route fires /api/spots, /api/lots and /api/spots/day-overrides
    // concurrently (order not guaranteed), so route the mock by SQL rather than
    // by call sequence. /api/presence is served by the stubbed fetchWeekPresence.
    // Return plain result objects (await unwraps them); avoids a
    // promise-returning mock callback, which the lint rules disallow here.
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('spot_day_status')) return { rows: [] }
      if (sql.includes('parking_lots'))
        return { rows: [{ id: 'l1', name: 'Zunanje parkirišče' }] }
      return {
        rows: [
          {
            id: 's1',
            number: 12,
            label: 'A12',
            status: 'occupied',
            lot_id: 'l1',
            owner_id: 'o1',
            owner_name: 'Janez Novak',
            active_booking_id: null,
          },
        ],
      }
    })

    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'owners' })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('Janez Novak')
    expect(res.body.text).toContain('A12')
    // No date supplied → defaults to today.
    expect(res.body.text).toContain('— today:')
    // Empty presence + occupied status → not free for others today.
    expect(res.body.text).toContain('🟥')

    // A supplied date is reflected in the header.
    const resTomorrow = await request(app)
      .post('/api/integrations/rocketchat')
      .send({
        token: WEBHOOK_TOKEN,
        user_name: 'jsernec',
        text: 'owners tomorrow',
      })
    expect(resTomorrow.status).toBe(200)
    expect(resTomorrow.body.text).toContain('— tomorrow:')

    // A building filter scopes the list and names the building in the header.
    const resBuilding = await request(app)
      .post('/api/integrations/rocketchat')
      .send({
        token: WEBHOOK_TOKEN,
        user_name: 'jsernec',
        text: 'owners zunaj',
      })
    expect(resBuilding.status).toBe(200)
    expect(resBuilding.body.text).toContain('in Zunanje parkirišče')
    expect(resBuilding.body.text).toContain('Janez Novak')
  })

  it('reports live occupancy via loopback (stats)', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('spot_day_status')) return { rows: [] }
      if (sql.includes('parking_lots'))
        return { rows: [{ id: 'l1', name: 'Zunanje parkirišče' }] }
      // s2 is returned twice (two active bookings) — must be deduped to 1 spot.
      return {
        rows: [
          { id: 's1', number: 1, label: 'Z-1', status: 'free', lot_id: 'l1' },
          {
            id: 's2',
            number: 2,
            label: 'Z-2',
            status: 'occupied',
            lot_id: 'l1',
            active_booking_id: 'b1',
            active_booking_expires_at: '2099-01-01T15:00:00.000Z',
          },
          {
            id: 's2',
            number: 2,
            label: 'Z-2',
            status: 'occupied',
            lot_id: 'l1',
            active_booking_id: 'b2',
            active_booking_expires_at: '2099-01-02T15:00:00.000Z',
          },
        ],
      }
    })

    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'stats' })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('Parking occupancy — today:')
    // Deduped to 2 spots (not 3): 1 free of 2.
    expect(res.body.text).toContain('1 of 2 free')
  })

  it('reports busiest times via loopback (peak hours)', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('EXTRACT(DOW'))
        return { rows: [{ weekday: 2, hour: 9, count: 12 }] }
      if (sql.includes('to_char(d')) return { rows: [] }
      return { rows: [] }
    })

    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'peak hours' })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('Busiest parking times')
    expect(res.body.text).toContain('Tuesday')
  })

  it('tells the user when a reserved spot does not exist', async () => {
    pinClock()
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale (bookings/my)
      .mockResolvedValueOnce({ rows: [] }) // my bookings (no same-day conflict)
      .mockResolvedValueOnce({
        rows: [{ id: 's1', number: 12, label: 'A12', status: 'free' }],
      }) // GET /api/spots

    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'reserve X22',
    })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('X22')
    expect(res.body.text.toLowerCase()).toContain('couldn’t find')
  })

  it('warns instead of replacing when you already have a booking that day', async () => {
    pinClock()
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    const today = new Date().toISOString().slice(0, 10)
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({
        rows: [
          {
            status: 'active',
            spot_label: 'Z-3',
            spot_number: 3,
            expires_at: `${today}T15:00:00.000Z`,
          },
        ],
      })

    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'reserve Z-9',
    })

    expect(res.status).toBe(200)
    expect(res.body.text.toLowerCase()).toContain('already have')
    expect(res.body.text).toContain('Z-3')
  })

  it("includes today's date in a map deep-link so it doesn't open on a stale day", async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('parking_lots'))
        return { rows: [{ id: 'l1', name: 'Zunanje parkirišče' }] }
      return {
        rows: [
          {
            id: 's1',
            number: 51,
            label: 'Z-51',
            status: 'free',
            lot_id: 'l1',
            owner_id: null,
          },
        ],
      }
    })

    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'map Z-51' })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('spot=s1')
    // The link carries the day so it can't reopen on a stale localStorage date.
    expect(res.body.text).toContain(`date=${localDate(new Date())}`)
  })

  describe('parseCommand — reminders', () => {
    it('parses the bare command', () => {
      expect(parseCommand('reminders')).toEqual({
        command: 'reminders',
        rest: [],
      })
    })
    it('parses on/off with a target', () => {
      expect(parseCommand('reminders off all')).toEqual({
        command: 'reminders',
        rest: ['off', 'all'],
      })
    })
  })

  it('returns booking history using a minted token (write/read path)', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({
        rows: [
          {
            booked_at: '2026-05-28T08:00:00Z',
            spot_label: 'A2',
            spot_number: 2,
            status: 'active',
          },
        ],
      })

    const res = await request(app)
      .post('/api/integrations/rocketchat')
      .send({ token: WEBHOOK_TOKEN, user_name: 'jsernec', text: 'history' })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('A2')
    expect(res.body.text).toContain('Your last')
  })

  it('status prepends an unread, un-pushed notification then marks it read', async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    let marked = false
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE notifications')) {
        marked = true
        return { rowCount: 1 }
      }
      if (sql.includes('FROM notifications')) {
        return marked
          ? { rows: [] }
          : {
              rows: [
                {
                  id: 'n1',
                  type: 'reservation_released',
                  title: 'Reservation released',
                  body: 'Your reservation for Z-17 on 2026-06-12 was released because the owner reclaimed the spot.',
                  data: null,
                  created_at: '2026-06-11T00:00:00Z',
                  read_at: null,
                  pushed_at: null,
                },
              ],
            }
      }
      return { rows: [] }
    })

    const res = await request(app).post('/api/integrations/rocketchat').send({
      token: WEBHOOK_TOKEN,
      user_name: 'jsernec',
      text: 'status',
    })

    expect(res.status).toBe(200)
    expect(res.body.text).toContain('⚠️')
    expect(res.body.text).toContain('was released because the owner reclaimed')
    expect(marked).toBe(true)
  })
})
