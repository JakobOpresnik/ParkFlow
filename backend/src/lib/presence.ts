import { getWeekDays } from './presence.helpers.js';
import type {
  EmployeeWeekPresence,
  OAuthResponse,
  TimesheetDayEntry,
  TimesheetEntry,
  WeekPresenceResponse,
} from './presence.types.js';

// re-export types and helpers so existing imports from 'lib/presence' keep working
export {
  getWeekDays,
  isOwnerAbsent,
  ownerTimesheetIds,
} from './presence.helpers.js';
export type {
  EmployeeWeekPresence,
  PresenceDayEntry,
  PresenceStatus,
  WeekPresenceResponse,
} from './presence.types.js';

// ─── Config ──────────────────────────────────────────────────────────────────

export const TIMESHEET_BASE_URL =
  process.env.TIMESHEET_API_URL ?? 'https://timesheet.abelium.com/api';
export const TIMESHEET_WS_URL =
  process.env.TIMESHEET_WS_URL ?? 'wss://timesheet.abelium.com/cable';
const TIMESHEET_APP_ID = process.env.TIMESHEET_APP_ID ?? '';
const TIMESHEET_SECRET = process.env.TIMESHEET_SECRET ?? '';

// ─── OAuth token cache ───────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAppApiToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await fetch(`${TIMESHEET_BASE_URL}/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: TIMESHEET_APP_ID,
      secret: TIMESHEET_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Timesheet OAuth error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OAuthResponse;
  cachedToken = data.access_token;
  // Refresh 5 minutes before actual expiry to be safe
  tokenExpiresAt = new Date(data.expires_at).getTime() - 5 * 60 * 1000;
  return cachedToken;
}

// ─── Timesheet entries fetch (with token retry) ─────────────────────────────

async function fetchTimesheetEntries(
  from: string,
  to: string,
): Promise<TimesheetEntry[]> {
  const attempt = async (): Promise<TimesheetEntry[]> => {
    const token = await getAppApiToken();
    const url = `${TIMESHEET_BASE_URL}/entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const response = await fetch(url, {
      headers: { 'X-APP-API-TOKEN': token },
    });

    if (!response.ok) {
      throw new Error(
        `Timesheet API error: ${response.status} ${response.statusText}`,
      );
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      // The API returned an error object (e.g. auth expired) with HTTP 200
      throw new TimesheetAuthError(
        `Timesheet API returned unexpected shape: ${JSON.stringify(raw)}`,
      );
    }
    return raw as TimesheetEntry[];
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof TimesheetAuthError) {
      // Invalidate cached token and retry once
      cachedToken = null;
      tokenExpiresAt = 0;
      return await attempt();
    }
    throw err;
  }
}

class TimesheetAuthError extends Error {}

// ─── Presence data cache ─────────────────────────────────────────────────────

const PRESENCE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let cachedPresence: WeekPresenceResponse | null = null;
let presenceCacheKey = '';
let presenceCacheExpiresAt = 0;

/**
 * Fetches weekly presence data for the week containing targetDate.
 * Pass { fresh: true } to bypass the cache — use this for booking checks
 * where stale presence data could allow a booking on an owner who is in office.
 */
export async function fetchWeekPresence(
  targetDate: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<WeekPresenceResponse> {
  const days: string[] = getWeekDays(targetDate);
  const from = days[0];
  const to = days[days.length - 1];

  if (!from || !to) {
    throw new Error(`Could not compute week range for date: ${targetDate}`);
  }

  const cacheKey = `${from}:${to}`;
  if (
    !fresh &&
    cachedPresence &&
    presenceCacheKey === cacheKey &&
    Date.now() < presenceCacheExpiresAt
  ) {
    return cachedPresence;
  }

  const entries = await fetchTimesheetEntries(from, to);

  // Extract work-free days from the first employee's data (holidays are the same for everyone)
  const workFreeDays: string[] = [];
  const firstEntry = entries[0];
  if (firstEntry) {
    for (const d of firstEntry.data) {
      if (d.is_work_free_day) {
        workFreeDays.push(d.date);
      }
    }
  }

  const employees = entries.map((entry: TimesheetEntry) => {
    if (!Array.isArray(entry.data)) {
      console.error(
        `Timesheet entry missing data array for user: ${entry.name}`,
      );
    }
    return {
      user_id: entry.user_id,
      name: entry.name,
      week: (entry.data ?? []).map((d: TimesheetDayEntry) => ({
        date: d.date,
        status: d.status,
        is_work_free_day: d.is_work_free_day,
        parking_available: d.parking_available ?? false,
      })),
    };
  });

  const result: WeekPresenceResponse = {
    employees,
    work_free_days: workFreeDays,
  };

  cachedPresence = result;
  presenceCacheKey = cacheKey;
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL;

  return result;
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
  const firstDate = employees[0]?.week[0]?.date;
  if (!firstDate) return;

  const weekDays = getWeekDays(firstDate);
  const from = weekDays[0];
  const to = weekDays[weekDays.length - 1];
  if (!from || !to) return;

  // Collect work-free days across all employees
  const wfdSet = new Set<string>();
  for (const emp of employees) {
    for (const d of emp.week) {
      if (d.is_work_free_day) wfdSet.add(d.date);
    }
  }

  cachedPresence = { employees, work_free_days: Array.from(wfdSet) };
  presenceCacheKey = `${from}:${to}`;
  // Extend TTL so the WS-seeded cache isn't immediately evicted
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL;
}

/**
 * Updates a single employee in the presence cache (from a WebSocket update
 * message). A no-op if the cache doesn't cover the same week yet.
 */
export function updatePresenceCacheEmployee(
  employee: EmployeeWeekPresence,
): void {
  if (!cachedPresence) return;

  const idx = cachedPresence.employees.findIndex(
    (e) => e.user_id === employee.user_id,
  );
  if (idx === -1) {
    cachedPresence.employees.push(employee);
  } else {
    cachedPresence.employees[idx] = employee;
  }

  // Re-derive work-free days in case they changed
  const wfdSet = new Set<string>();
  for (const emp of cachedPresence.employees) {
    for (const d of emp.week) {
      if (d.is_work_free_day) wfdSet.add(d.date);
    }
  }
  cachedPresence.work_free_days = Array.from(wfdSet);

  // Keep cache fresh — reset TTL so a REST call doesn't overwrite us too soon
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL;
}

/** Invalidates the cached OAuth token (call when WebSocket reports auth failure). */
export function invalidateAppApiToken(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}
