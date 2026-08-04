export type PresenceStatus =
  | 'in_office'
  | 'remote'
  | 'sick'
  | 'care'
  | 'vacation'
  | 'no_entry'

export interface PresenceDayEntry {
  date: string
  status: PresenceStatus
  is_work_free_day: boolean
  parking_available: boolean
}

export interface EmployeeWeekPresence {
  user_id: number
  name: string
  // Work email and the parking spot the timesheet app has this employee
  // assigned to. Both are persisted onto the matching `owners` row (see
  // lib/ownerSync.ts) and stripped from the /api/presence response — no UI reads
  // them. Null when the source doesn't supply one (the dormant WS payload
  // carries neither).
  email: string | null
  parking_spot: string | null
  week: PresenceDayEntry[]
}

export interface WeekPresenceResponse {
  employees: EmployeeWeekPresence[]
  work_free_days: string[]
}

// Wire shape of a day entry from the timesheet API — currently identical to
// PresenceDayEntry, so aliased rather than duplicated.
export type TimesheetDayEntry = PresenceDayEntry

export interface TimesheetEntry {
  user_id: number
  name: string
  email?: string | null
  parking_spot?: string | null
  data: TimesheetDayEntry[]
}
