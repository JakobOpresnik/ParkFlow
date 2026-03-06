const TIMESHEET_BASE_URL =
  process.env.TIMESHEET_API_URL ?? "https://timesheet.abelium.com/api";
const TIMESHEET_API_KEY = process.env.TIMESHEET_API_KEY ?? "";
export const TIMESHEET_MOCK = process.env.TIMESHEET_MOCK === "true";

export type PresenceStatus =
  | "in_office"
  | "remote"
  | "sick"
  | "care"
  | "vacation"
  | "no_entry";

export interface PresenceDayEntry {
  date: string;
  status: PresenceStatus;
}

export interface EmployeeWeekPresence {
  user_id: number;
  name: string;
  week: PresenceDayEntry[];
}

// Returns YYYY-MM-DD for Mon–Fri of the week containing referenceDate
export function getWeekDays(referenceDate: string): string[] {
  const ref = new Date(referenceDate + "T12:00:00Z");
  const dow = ref.getUTCDay();
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

interface MockEmployee {
  user_id: number;
  name: string;
  pattern: PresenceStatus[];
}

const MOCK_EMPLOYEES: MockEmployee[] = [
  // Klet -1 owners
  {
    user_id: 1,
    name: "Urška Krivc",
    pattern: ["in_office", "in_office", "remote", "in_office", "in_office"],
  },
  {
    user_id: 2,
    name: "Mitja Gornik",
    pattern: ["remote", "in_office", "in_office", "remote", "in_office"],
  },
  {
    user_id: 3,
    name: "Petra Jakovac",
    pattern: ["vacation", "vacation", "vacation", "vacation", "vacation"],
  },
  {
    user_id: 4,
    name: "Borut Mrak",
    pattern: ["remote", "remote", "in_office", "remote", "remote"],
  },
  {
    user_id: 5,
    name: "Marko Stijepić",
    pattern: ["in_office", "in_office", "in_office", "in_office", "in_office"],
  },
  {
    user_id: 6,
    name: "Bernard Sovdat",
    pattern: ["sick", "sick", "sick", "no_entry", "no_entry"],
  },
  {
    user_id: 7,
    name: "Iztok Kavkler / Jan Grošelj",
    pattern: ["in_office", "remote", "in_office", "in_office", "remote"],
  },
  {
    user_id: 8,
    name: "Primož Lukšič",
    pattern: ["in_office", "in_office", "remote", "in_office", "in_office"],
  },
  {
    user_id: 9,
    name: "Tilen Šarlah",
    pattern: ["remote", "remote", "remote", "in_office", "remote"],
  },
  {
    user_id: 10,
    name: "Tadeja Gornik",
    pattern: ["in_office", "in_office", "in_office", "care", "care"],
  },
  {
    user_id: 11,
    name: "Marko Boben",
    pattern: ["in_office", "remote", "in_office", "in_office", "in_office"],
  },
  {
    user_id: 12,
    name: "Boris Horvat",
    pattern: ["no_entry", "vacation", "vacation", "vacation", "no_entry"],
  },
  {
    user_id: 13,
    name: "Barbara Kepic",
    pattern: ["in_office", "in_office", "in_office", "remote", "in_office"],
  },
  {
    user_id: 14,
    name: "Alen Orbanić",
    pattern: ["remote", "in_office", "remote", "remote", "in_office"],
  },
  {
    user_id: 15,
    name: "Katarina Rakar",
    pattern: ["in_office", "in_office", "in_office", "in_office", "remote"],
  },
  {
    user_id: 16,
    name: "Miha Burgar",
    pattern: ["in_office", "remote", "in_office", "remote", "in_office"],
  },
  {
    user_id: 17,
    name: "Jernej Borlinić",
    pattern: ["in_office", "in_office", "remote", "in_office", "vacation"],
  },
  // Klet -2 owners
  {
    user_id: 18,
    name: "Evgenija Burger",
    pattern: ["remote", "in_office", "in_office", "in_office", "remote"],
  },
  {
    user_id: 19,
    name: "Tilen Marc / Demijan Lesjak / Timotej Vesel",
    pattern: ["in_office", "in_office", "remote", "in_office", "in_office"],
  },
  {
    user_id: 20,
    name: "Boštjan Kovač / Aljaž Konečnik",
    pattern: ["in_office", "remote", "in_office", "remote", "in_office"],
  },
];

function buildMockResponse(targetDate: string): EmployeeWeekPresence[] {
  const days = getWeekDays(targetDate);
  return MOCK_EMPLOYEES.map((emp) => ({
    user_id: emp.user_id,
    name: emp.name,
    week: days.map((date, i) => ({
      date,
      status: emp.pattern[i] as PresenceStatus,
    })),
  }));
}

/**
 * Fetches weekly presence data for the week containing targetDate.
 * Uses mock data if TIMESHEET_MOCK=true, otherwise calls the real API.
 */
export async function fetchWeekPresence(
  targetDate: string,
): Promise<EmployeeWeekPresence[]> {
  if (TIMESHEET_MOCK) {
    return buildMockResponse(targetDate);
  }

  const url = `${TIMESHEET_BASE_URL}/presence/week?date=${encodeURIComponent(targetDate)}`;
  const response = await fetch(url, {
    headers: { "X-API-KEY": TIMESHEET_API_KEY },
  });

  if (!response.ok) {
    throw new Error(
      `Timesheet API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<EmployeeWeekPresence[]>;
}

/**
 * Returns true if the named owner is absent (not in_office) on the given date.
 * Returns false if the owner is not found in the timesheet data.
 */
export function isOwnerAbsent(
  presence: EmployeeWeekPresence[],
  ownerName: string,
  date: string,
): boolean {
  const entry = presence.find(
    (p) => p.name.toLowerCase() === ownerName.toLowerCase(),
  );
  if (!entry) return false;
  const day = entry.week.find((d) => d.date === date);
  return day !== undefined && day.status !== "in_office";
}
