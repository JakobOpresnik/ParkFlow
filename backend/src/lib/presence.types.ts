export type PresenceStatus =
  | 'in_office'
  | 'remote'
  | 'sick'
  | 'care'
  | 'vacation'
  | 'no_entry';

export interface PresenceDayEntry {
  date: string;
  status: PresenceStatus;
  is_work_free_day: boolean;
  parking_available: boolean;
}

export interface EmployeeWeekPresence {
  user_id: number;
  name: string;
  week: PresenceDayEntry[];
}

export interface WeekPresenceResponse {
  employees: EmployeeWeekPresence[];
  work_free_days: string[];
}

export interface OAuthResponse {
  access_token: string;
  expires_at: string;
}

// Wire shape of a day entry from the timesheet API — currently identical to
// PresenceDayEntry, so aliased rather than duplicated.
export type TimesheetDayEntry = PresenceDayEntry;

export interface TimesheetEntry {
  user_id: number;
  name: string;
  data: TimesheetDayEntry[];
}
