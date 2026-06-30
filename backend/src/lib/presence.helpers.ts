import type { WeekPresenceResponse } from './presence.types.js'

// Returns YYYY-MM-DD for Mon–Fri of the week containing referenceDate
export function getWeekDays(referenceDate: string): string[] {
  const ref = new Date(referenceDate + 'T12:00:00Z')
  const dow = ref.getUTCDay()
  const monday = new Date(ref)
  monday.setUTCDate(ref.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 5 }, (_, index: number) => {
    const date = new Date(monday)
    date.setUTCDate(monday.getUTCDate() + index)
    return date.toISOString().slice(0, 10)
  })
}

/**
 * Returns true if the named owner's parking spot is available for booking on
 * the given date. Only parking_available is checked — work status is ignored.
 * Work-free days (holidays) are always free regardless.
 * Returns false (spot is occupied) if the owner is not found in the timesheet.
 */
export function isOwnerAbsent(
  presence: WeekPresenceResponse,
  ownerName: string,
  date: string,
): boolean {
  if (presence.work_free_days.includes(date)) return true

  const entry = presence.employees.find(
    (p) => p.name.toLowerCase() === ownerName.toLowerCase(),
  )
  if (!entry) return false
  const day = entry.week.find((d) => d.date === date)
  if (!day) return false

  return day.parking_available === true
}

/**
 * Numeric Abelium timesheet user_ids for the given parking-spot owner names,
 * resolved by matching each name (case-insensitive) against the timesheet
 * presence roster — the only link between an owner row and its numeric id, since
 * the `owners` table stores SSO usernames + names, never numeric ids.
 *
 * Owner names may be slash-separated co-owners ("Jakob Opresnik/Jan Novak");
 * each segment is matched independently. Owners with no matching timesheet
 * employee (external/placeholder rows, or a name that doesn't line up) are
 * omitted. Returns a de-duplicated, ascending array.
 */
export function ownerTimesheetIds(
  presence: WeekPresenceResponse,
  ownerNames: string[],
): number[] {
  const wanted = new Set(
    ownerNames.flatMap((name) =>
      name
        .split('/')
        .map((segment) => segment.trim().toLowerCase())
        .filter(Boolean),
    ),
  )

  const ids = new Set<number>()
  for (const employee of presence.employees) {
    if (wanted.has(employee.name.trim().toLowerCase())) {
      ids.add(employee.user_id)
    }
  }
  return [...ids].sort((a, b) => a - b)
}
