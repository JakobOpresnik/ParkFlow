import { envOr } from './env.js'
import { getWeekDays } from './presence.helpers.js'
import type {
  EmployeeWeekPresence,
  TimesheetDayEntry,
  TimesheetEntry,
  WeekPresenceResponse,
} from './presence.types.js'

// re-export types and helpers so existing imports from 'lib/presence' keep working
export { getWeekDays, isOwnerAbsent } from './presence.helpers.js'
export type {
  EmployeeWeekPresence,
  PresenceDayEntry,
  PresenceStatus,
  WeekPresenceResponse,
} from './presence.types.js'

// ─── Config ──────────────────────────────────────────────────────────────────

// AI uprava timesheet API (replaced timesheet.abelium.com) — company network only.
// envOr, not ??: an unset deploy variable arrives as '' and must not blank the URL.
export const TIMESHEET_BASE_URL = envOr(
  'TIMESHEET_API_URL',
  'https://ai-uprava.matheo.si/api/v1/timesheet',
)
// Empty = no push channel yet, so the WS client stays dormant. See presencePoll.ts.
export const TIMESHEET_WS_URL = envOr('TIMESHEET_WS_URL', '')

// Static bearer token, read per call so a late dotenv/test assignment applies.
// A blank value fails loudly as "not configured" rather than sending `Bearer `.
export function timesheetApiToken(): string {
  return envOr('TIMESHEET_API_TOKEN', '')
}

// ─── Timesheet entries fetch ─────────────────────────────────────────────────

async function fetchTimesheetEntries(
  from: string,
  to: string,
): Promise<TimesheetEntry[]> {
  const token = timesheetApiToken()
  if (!token) {
    throw new Error('TIMESHEET_API_TOKEN is not configured')
  }

  const url = `${TIMESHEET_BASE_URL}/entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    // Include the API's `{"detail": ...}` so a bad token/date is obvious in the log.
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Timesheet API error: ${response.status} ${response.statusText}` +
        (detail ? ` — ${detail.slice(0, 200)}` : ''),
    )
  }

  const raw = await response.json()
  if (!Array.isArray(raw)) {
    throw new Error(
      `Timesheet API returned unexpected shape: ${JSON.stringify(raw).slice(0, 200)}`,
    )
  }
  return raw as TimesheetEntry[]
}

// ─── Presence data cache ─────────────────────────────────────────────────────

const PRESENCE_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
let cachedPresence: WeekPresenceResponse | null = null
let presenceCacheKey = ''
let presenceCacheExpiresAt = 0

/**
 * Fetches weekly presence data for the week containing targetDate.
 * Pass { fresh: true } to bypass the cache — use this for booking checks
 * where stale presence data could allow a booking on an owner who is in office.
 */
export async function fetchWeekPresence(
  targetDate: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<WeekPresenceResponse> {
  const days: string[] = getWeekDays(targetDate)
  const from = days[0]
  const to = days[days.length - 1]

  if (!from || !to) {
    throw new Error(`Could not compute week range for date: ${targetDate}`)
  }

  const cacheKey = `${from}:${to}`
  if (
    !fresh &&
    cachedPresence &&
    presenceCacheKey === cacheKey &&
    Date.now() < presenceCacheExpiresAt
  ) {
    return cachedPresence
  }

  const entries = await fetchTimesheetEntries(from, to)

  // Extract work-free days from the first employee's data (holidays are the same for everyone)
  const workFreeDays: string[] = []
  const firstEntry = entries[0]
  if (firstEntry) {
    for (const d of firstEntry.data) {
      if (d.is_work_free_day) {
        workFreeDays.push(d.date)
      }
    }
  }

  const employees = entries.map((entry: TimesheetEntry) => {
    if (!Array.isArray(entry.data)) {
      console.error(
        `Timesheet entry missing data array for user: ${entry.name}`,
      )
    }
    return {
      user_id: entry.user_id,
      name: entry.name,
      email: entry.email ?? null,
      parking_spot: entry.parking_spot ?? null,
      week: (entry.data ?? []).map((d: TimesheetDayEntry) => ({
        date: d.date,
        status: d.status,
        is_work_free_day: d.is_work_free_day,
        parking_available: d.parking_available ?? false,
      })),
    }
  })

  const result: WeekPresenceResponse = {
    employees,
    work_free_days: workFreeDays,
  }

  cachedPresence = result
  presenceCacheKey = cacheKey
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL

  return result
}

// ─── Cache mutation helpers (used by WebSocket manager) ──────────────────────

/**
 * Replaces the entire presence cache with data received from the WebSocket
 * initial message. The cache key is computed using the same Mon–Fri range as
 * fetchWeekPresence so that subsequent REST refetches hit the cache instead of
 * bypassing it (the WS data includes weekends, REST does not).
 */
export function setPresenceCacheFromWs(
  employees: EmployeeWeekPresence[],
): void {
  // Use the first date in the WS data to anchor the Mon–Fri week range
  const firstDate = employees[0]?.week[0]?.date
  if (!firstDate) return

  const weekDays = getWeekDays(firstDate)
  const from = weekDays[0]
  const to = weekDays[weekDays.length - 1]
  if (!from || !to) return

  // Collect work-free days across all employees
  const wfdSet = new Set<string>()
  for (const emp of employees) {
    for (const d of emp.week) {
      if (d.is_work_free_day) wfdSet.add(d.date)
    }
  }

  cachedPresence = { employees, work_free_days: Array.from(wfdSet) }
  presenceCacheKey = `${from}:${to}`
  // Extend TTL so the WS-seeded cache isn't immediately evicted
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL
}

/**
 * Updates a single employee in the presence cache (from a WebSocket update
 * message). A no-op if the cache doesn't cover the same week yet.
 */
export function updatePresenceCacheEmployee(
  employee: EmployeeWeekPresence,
): void {
  if (!cachedPresence) return

  const idx = cachedPresence.employees.findIndex(
    (e) => e.user_id === employee.user_id,
  )
  if (idx === -1) {
    cachedPresence.employees.push(employee)
  } else {
    cachedPresence.employees[idx] = employee
  }

  // Re-derive work-free days in case they changed
  const wfdSet = new Set<string>()
  for (const emp of cachedPresence.employees) {
    for (const d of emp.week) {
      if (d.is_work_free_day) wfdSet.add(d.date)
    }
  }
  cachedPresence.work_free_days = Array.from(wfdSet)

  // Keep cache fresh — reset TTL so a REST call doesn't overwrite us too soon
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL
}
