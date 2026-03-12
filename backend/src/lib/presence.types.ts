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

export interface TimesheetDayEntry {
  date: string;
  status: PresenceStatus;
  is_work_free_day: boolean;
}

export interface TimesheetEntry {
  user_id: number;
  name: string;
  data: TimesheetDayEntry[];
}
