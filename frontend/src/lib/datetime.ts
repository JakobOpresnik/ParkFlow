// Locale-aware relative-time formatting and booking-window progress, shared
// across notifications and the active-booking surfaces.

const DIVISIONS: readonly {
  amount: number
  unit: Intl.RelativeTimeFormatUnit
}[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

// "2 hours ago" / "in 3 hours" / "now", in the given locale. Falls back to the
// raw ISO string if it can't be parsed.
export function relativeTime(iso: string, locale: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return iso
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  let duration = (ts - Date.now()) / 1000
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return rtf.format(Math.round(duration), 'year')
}

// How far a booking has progressed through its [start, end] window, as 0–100.
// Returns 0 for invalid or degenerate windows. `now` defaults to the current
// time so render sites don't have to call Date.now() themselves.
export function expiryProgressPct(
  startIso: string,
  endIso: string,
  now: number = Date.now(),
): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const pct = ((now - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, pct))
}

// Local-time "HH:MM" label in the viewer's locale.
export function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
