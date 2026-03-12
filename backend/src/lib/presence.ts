import { getWeekDays } from './presence.helpers.js';
import type {
  OAuthResponse,
  TimesheetDayEntry,
  TimesheetEntry,
  WeekPresenceResponse,
} from './presence.types.js';

// re-export types and helpers so existing imports from 'lib/presence' keep working
export { getWeekDays, isOwnerAbsent } from './presence.helpers.js';
export type {
  EmployeeWeekPresence,
  PresenceDayEntry,
  PresenceStatus,
  WeekPresenceResponse,
} from './presence.types.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const TIMESHEET_BASE_URL =
  process.env.TIMESHEET_API_URL ?? 'https://timesheet.abelium.com/api';
const TIMESHEET_APP_ID = process.env.TIMESHEET_APP_ID ?? '';
const TIMESHEET_SECRET = process.env.TIMESHEET_SECRET ?? '';

// ─── OAuth token cache ───────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAppApiToken(): Promise<string> {
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

// ─── Presence data cache ─────────────────────────────────────────────────────

const PRESENCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedPresence: WeekPresenceResponse | null = null;
let presenceCacheKey = '';
let presenceCacheExpiresAt = 0;

/**
 * Fetches weekly presence data for the week containing targetDate.
 */
export async function fetchWeekPresence(
  targetDate: string,
): Promise<WeekPresenceResponse> {
  const days: string[] = getWeekDays(targetDate);
  const from = days.at(0);
  const to = days.at(-1);

  if (!from || !to) {
    throw new Error(`Could not compute week range for date: ${targetDate}`);
  }

  const cacheKey = `${from}:${to}`;
  if (
    cachedPresence &&
    presenceCacheKey === cacheKey &&
    Date.now() < presenceCacheExpiresAt
  ) {
    return cachedPresence;
  }

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

  const entries = (await response.json()) as TimesheetEntry[];

  // Extract work-free days from the first employee's data (holidays are the same for everyone)
  const workFreeDays: string[] = [];
  const firstEntry = entries.at(0);
  if (firstEntry) {
    for (const d of firstEntry.data) {
      if (d.is_work_free_day) {
        workFreeDays.push(d.date);
      }
    }
  }

  const employees = entries.map((entry: TimesheetEntry) => ({
    user_id: entry.user_id,
    name: entry.name,
    week: entry.data.map((d: TimesheetDayEntry) => ({
      date: d.date,
      status: d.status,
      is_work_free_day: d.is_work_free_day,
    })),
  }));

  const result: WeekPresenceResponse = {
    employees,
    work_free_days: workFreeDays,
  };

  cachedPresence = result;
  presenceCacheKey = cacheKey;
  presenceCacheExpiresAt = Date.now() + PRESENCE_CACHE_TTL;

  return result;
}
