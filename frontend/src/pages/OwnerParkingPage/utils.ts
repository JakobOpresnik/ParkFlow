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

export function getNext7Days(today: string): string[] {
  const days: string[] = []
  const base = new Date(today + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
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
  presenceMap: Map<string, string>,
  weekBookings: OwnerWeekBooking[],
  overrides: SpotDayOverride[],
): DayStatus {
  const hasBooking = weekBookings.some(
    (b) =>
      b.spot_id === spot.id &&
      b.status === 'active' &&
      b.expires_at.slice(0, 10) >= date &&
      (b.starts_at ?? b.booked_at).slice(0, 10) <= date,
  )
  if (hasBooking) return 'reserved'

  const override = overrides.find(
    (o) => o.spot_id === spot.id && o.date.slice(0, 10) === date,
  )
  if (override) return override.status

  if (spot.owner_name) {
    const status = presenceMap.get(spot.owner_name.toLowerCase())
    if (status && status !== 'in_office') return 'free'
    if (status === 'in_office') return 'occupied'
  }

  return spot.status === 'reserved' ? 'free' : spot.status
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
