import type { WeekPresenceResponse } from './presence.types.js';

// Returns YYYY-MM-DD for Mon–Fri of the week containing referenceDate
export function getWeekDays(referenceDate: string): string[] {
  const ref = new Date(referenceDate + 'T12:00:00Z');
  const dow = ref.getUTCDay();
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 5 }, (_, index: number) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

/**
 * Returns true if the named owner is absent (not in_office) on the given date,
 * or if the date is a work-free day (holiday).
 * Returns false if the owner is not found in the timesheet data.
 */
export function isOwnerAbsent(
  presence: WeekPresenceResponse,
  ownerName: string,
  date: string,
): boolean {
  if (presence.work_free_days.includes(date)) return true;

  const entry = presence.employees.find(
    (p) => p.name.toLowerCase() === ownerName.toLowerCase(),
  );
  if (!entry) return false;
  const day = entry.week.find((d) => d.date === date);
  return day !== undefined && day.status !== 'in_office';
}
