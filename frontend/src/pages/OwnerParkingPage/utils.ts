import type { OwnerSpot, OwnerWeekBooking, SpotDayOverride } from '@/types'

import type { DayStatus } from './types'

// — constants —

export const StatusConfig: Record<
  DayStatus,
  { dot: string; color: string; border: string }
> = {
  free: {
    dot: 'bg-green-500',
    color: 'green',
    border: 'border-l-4 border-l-green-500',
  },
  occupied: {
    dot: 'bg-orange-400',
    color: 'orange',
    border: 'border-l-4 border-l-orange-400',
  },
  reserved: {
    dot: 'bg-blue-500',
    color: 'blue',
    border: 'border-l-4 border-l-blue-500',
  },
}

// — helpers —

export function formatDateTime(iso: string, locale = 'en'): string {
  return new Date(iso).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(dateStr: string, locale = 'en'): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Returns Mon–Sun of the week containing referenceDate
export function getWeekDays7(referenceDate: string): string[] {
  const ref = new Date(referenceDate + 'T12:00:00')
  const dow = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

// Returns the Monday of the prev/next week
export function getAdjacentWeek(
  days: string[],
  direction: 'prev' | 'next',
): string {
  const ref = days[0]!
  const d = new Date(ref + 'T12:00:00')
  d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
  return d.toISOString().slice(0, 10)
}

export function getWeekLabel(days: string[], locale = 'en'): string {
  if (days.length === 0) return ''
  const first = new Date(days[0]! + 'T12:00:00')
  const last = new Date(days[days.length - 1]! + 'T12:00:00')
  const firstStr = first.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
  if (first.getMonth() === last.getMonth()) {
    return `${firstStr}–${last.getDate()}`
  }
  return `${firstStr} – ${last.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
}

// Returns the first selectable workday in `days`, skipping past dates, weekends,
// and holidays. Falls back to days[0] if the whole week is unavailable.
export function getFirstWorkday(
  days: string[],
  today: string,
  workFreeDays: string[],
): string {
  return days.find((d) => !isNonWorkDay(d, today, workFreeDays)) ?? days[0]!
}

export function isNonWorkDay(
  date: string,
  today: string,
  workFreeDays: string[],
): boolean {
  if (date < today) return true
  const dow = new Date(date + 'T00:00:00').getDay()
  if (dow === 0 || dow === 6) return true
  return workFreeDays.includes(date)
}

/** Reservations close at 19:00 on the current day. */
export function isPastBookingCutoff(date: string, today: string): boolean {
  return date === today && new Date().getHours() >= 19
}

export function computeDayStatus(
  spot: OwnerSpot,
  date: string,
  presenceMap: Map<string, boolean>,
  weekBookings: OwnerWeekBooking[],
  overrides: SpotDayOverride[],
): DayStatus {
  const hasBooking = weekBookings.some(
    (b) =>
      b.spot_id === spot.id && b.status === 'active' && b.booking_date === date,
  )
  if (hasBooking) return 'reserved'

  const override = overrides.find(
    (o) => o.spot_id === spot.id && o.date.slice(0, 10) === date,
  )
  if (override) return override.status

  if (spot.owner_name) {
    const parkingAvailable = presenceMap.get(spot.owner_name.toLowerCase())
    if (parkingAvailable === true) return 'free'
    if (parkingAvailable === false) return 'occupied'
    // undefined → no presence data, fall through to spot default
  }

  // 'unconfirmed' is only a derived UI state, not a stored OwnerSpot status,
  // but TS narrowing requires we collapse anything non-'occupied' to 'free'.
  return spot.status === 'occupied' ? 'occupied' : 'free'
}

export function hasOverrideForDay(
  spotId: string,
  date: string,
  overrides: SpotDayOverride[],
): boolean {
  return overrides.some(
    (o) => o.spot_id === spotId && o.date.slice(0, 10) === date,
  )
}
