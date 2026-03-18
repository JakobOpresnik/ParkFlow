import type { SpotStatus } from '@/types'

// ─── constants ────────────────────────────────────────────────────────────────

export const StatusDotClass: Record<SpotStatus, string> = {
  free: 'bg-spot-free',
  occupied: 'bg-spot-occupied',
  reserved: 'bg-spot-reserved',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

export function getWeekDays(referenceDate: string): string[] {
  // Returns YYYY-MM-DD for Mon–Fri of the week containing referenceDate
  const ref = new Date(referenceDate + 'T12:00:00')
  const dow = ref.getDay() // 0=Sun, 1=Mon, …, 6=Sat
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function formatDayLabel(
  dateStr: string,
  locale = 'en',
): {
  short: string
  num: number
} {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    short: d.toLocaleDateString(locale, { weekday: 'short' }),
    num: d.getDate(),
  }
}

export function computeFridayWindowPassed(
  arrivalTime: string,
  reservationDuration: number,
): boolean {
  const [hh, mm] = arrivalTime.split(':').map(Number)
  const arrival = new Date()
  arrival.setHours(hh ?? 9, mm ?? 0, 0, 0)
  return (
    new Date(arrival.getTime() + reservationDuration * 3_600_000) <= new Date()
  )
}

export function getTodayDotClass(
  isToday: boolean,
  isSelected: boolean,
  isMapMode: boolean,
): string {
  if (!isToday) return 'invisible'
  if (isSelected) return isMapMode ? 'bg-white' : 'bg-primary-foreground'
  return isMapMode ? 'bg-white/60' : 'bg-primary'
}
