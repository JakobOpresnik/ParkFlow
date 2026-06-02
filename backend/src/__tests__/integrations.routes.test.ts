import type { Server } from "node:http";

import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createApp } from "../app.js";
import {
  activeBookingOnDate,
  dayLabel,
  formatCancelResult,
  formatFreeSpots,
  formatFreeSpotsByBuilding,
  formatHistory,
  formatOwners,
  formatReserveResult,
  formatStatus,
  HELP_TEXT,
  isGrabbable,
  isSpotAvailableOnDate,
  ljubljanaInstant,
  parseCommand,
  parseDate,
  pickRandomFree,
  resolveLot,
  spotLink,
  workDayOver,
} from "../routes/integrations.js";

vi.mock("../db/pool.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

// Stub the timesheet fetch so the `owners` loopback test (which hits
// /api/presence) doesn't make a real external call. This only affects the
// presence route; integrations.ts imports the real isOwnerAbsent straight from
// presence.helpers.js, so the pure-function availability tests are unaffected.
vi.mock("../lib/presence.js", () => ({
  fetchWeekPresence: vi.fn().mockResolvedValue({
    employees: [],
    work_free_days: [],
  }),
  isOwnerAbsent: vi.fn().mockReturnValue(false),
}));

const { pool } = await import("../db/pool.js");
const mockQuery = pool.query as ReturnType<typeof vi.fn>;

const WEBHOOK_TOKEN = "rc-shared-secret";
const NOW = new Date("2026-06-01T09:00:00.000Z");

beforeEach(() => {
  vi.resetAllMocks();
  process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
});

// --- parseCommand -----------------------------------------------------------

describe("parseCommand", () => {
  it("maps help / info / ?", () => {
    expect(parseCommand("help").command).toBe("help");
    expect(parseCommand("info").command).toBe("help");
    expect(parseCommand("?").command).toBe("help");
  });

  it("maps status and me", () => {
    expect(parseCommand("status").command).toBe("status");
    expect(parseCommand("me").command).toBe("status");
  });

  it('treats "free spots" / "spots" / "available" / bare "free" as the list command', () => {
    expect(parseCommand("free spots")).toEqual({ command: "spots", rest: [] });
    expect(parseCommand("spots")).toEqual({ command: "spots", rest: [] });
    expect(parseCommand("available")).toEqual({ command: "spots", rest: [] });
    expect(parseCommand("free")).toEqual({ command: "spots", rest: [] });
  });

  it("keeps a building filter as rest for the list command", () => {
    expect(parseCommand("free spots zunaj")).toEqual({
      command: "spots",
      rest: ["zunaj"],
    });
    expect(parseCommand("spots klet1")).toEqual({
      command: "spots",
      rest: ["klet1"],
    });
  });

  it('treats "free spot" / "free spots" as listing free spots', () => {
    expect(parseCommand("free spot")).toEqual({ command: "spots", rest: [] });
    expect(parseCommand("free spots")).toEqual({ command: "spots", rest: [] });
    expect(parseCommand("free spots klet1")).toEqual({
      command: "spots",
      rest: ["klet1"],
    });
  });

  it("maps reserve / book with arguments", () => {
    expect(parseCommand("reserve A12")).toEqual({
      command: "reserve",
      rest: ["A12"],
    });
    expect(parseCommand("book A12 tomorrow")).toEqual({
      command: "reserve",
      rest: ["A12", "tomorrow"],
    });
  });

  it('maps cancel and consumes an optional "reservation" word', () => {
    expect(parseCommand("cancel")).toEqual({ command: "cancel", rest: [] });
    expect(parseCommand("cancel reservation")).toEqual({
      command: "cancel",
      rest: [],
    });
    expect(parseCommand("cancel A12")).toEqual({
      command: "cancel",
      rest: ["A12"],
    });
  });

  it("maps history / log", () => {
    expect(parseCommand("history").command).toBe("history");
    expect(parseCommand("log").command).toBe("history");
  });

  it("maps the map / where command with an optional argument", () => {
    expect(parseCommand("map")).toEqual({ command: "map", rest: [] });
    expect(parseCommand("where Z-3")).toEqual({
      command: "map",
      rest: ["Z-3"],
    });
  });

  it("maps owners (exact word only — no aliases) and keeps a date arg", () => {
    expect(parseCommand("owners")).toEqual({ command: "owners", rest: [] });
    expect(parseCommand("owners tomorrow")).toEqual({
      command: "owners",
      rest: ["tomorrow"],
    });
    // Near-misses must NOT trigger the roster.
    expect(parseCommand("owner").command).toBe("unknown");
    expect(parseCommand("who").command).toBe("unknown");
    expect(parseCommand("whose").command).toBe("unknown");
  });

  it("returns unknown for unrecognised or empty input", () => {
    expect(parseCommand("blabla").command).toBe("unknown");
    expect(parseCommand("").command).toBe("unknown");
  });

  it("recognises greetings (SI + EN)", () => {
    for (const g of ["hej", "hi", "živjo", "zivjo", "servus", "sergus"]) {
      expect(parseCommand(g).command).toBe("greet");
    }
  });
});

// --- parseDate --------------------------------------------------------------

describe("parseDate", () => {
  it("defaults to today when no token is given", () => {
    expect(parseDate(undefined, NOW)).toBe("2026-06-01");
  });

  it("understands today and tomorrow", () => {
    expect(parseDate("today", NOW)).toBe("2026-06-01");
    expect(parseDate("tomorrow", NOW)).toBe("2026-06-02");
  });

  it("resolves today in Slovenian local time, not UTC", () => {
    // 23:30 UTC on 2026-06-01 is already 01:30 on 2026-06-02 in Ljubljana.
    const late = new Date("2026-06-01T23:30:00.000Z");
    expect(parseDate("today", late)).toBe("2026-06-02");
    expect(parseDate("tomorrow", late)).toBe("2026-06-03");
  });

  it("parses dd.mm.yyyy", () => {
    expect(parseDate("03.06.2026", NOW)).toBe("2026-06-03");
  });

  it("accepts single-digit day and month", () => {
    expect(parseDate("2.6.2026", NOW)).toBe("2026-06-02");
    expect(parseDate("2.6.2026", NOW)).toBe(parseDate("02.06.2026", NOW));
  });

  it("returns null for an impossible or malformed date", () => {
    expect(parseDate("32.13.2026", NOW)).toBeNull();
    expect(parseDate("please", NOW)).toBeNull();
    expect(parseDate("3-6-2026", NOW)).toBeNull();
  });
});

// --- dayLabel ---------------------------------------------------------------

describe("dayLabel", () => {
  it("labels today and tomorrow relative to now", () => {
    expect(dayLabel("2026-06-01", NOW)).toBe("today");
    expect(dayLabel("2026-06-02", NOW)).toBe("tomorrow");
  });

  it("falls back to DD.MM.YYYY for any other date", () => {
    expect(dayLabel("2026-06-05", NOW)).toBe("05.06.2026");
  });
});

// --- ljubljanaInstant -------------------------------------------------------

describe("ljubljanaInstant", () => {
  it("maps 09:00/17:00 local to UTC in summer (CEST = UTC+2)", () => {
    expect(ljubljanaInstant("2026-06-01", 9)).toBe("2026-06-01T07:00:00.000Z");
    expect(ljubljanaInstant("2026-06-01", 17)).toBe("2026-06-01T15:00:00.000Z");
  });

  it("maps 09:00/17:00 local to UTC in winter (CET = UTC+1)", () => {
    expect(ljubljanaInstant("2026-01-15", 9)).toBe("2026-01-15T08:00:00.000Z");
    expect(ljubljanaInstant("2026-01-15", 17)).toBe("2026-01-15T16:00:00.000Z");
  });
});

// --- workDayOver ------------------------------------------------------------

describe("workDayOver", () => {
  it("is false during working hours today", () => {
    // 09:00 UTC = 11:00 Ljubljana (summer) — still within the day.
    expect(
      workDayOver("2026-06-01", new Date("2026-06-01T09:00:00.000Z")),
    ).toBe(false);
  });

  it("is true once today is past 17:00 local", () => {
    // 20:00 UTC = 22:00 Ljubljana (summer) — working day is over.
    expect(
      workDayOver("2026-06-01", new Date("2026-06-01T20:00:00.000Z")),
    ).toBe(true);
  });

  it("is false for a future date regardless of the current time", () => {
    expect(
      workDayOver("2026-06-02", new Date("2026-06-01T20:00:00.000Z")),
    ).toBe(false);
  });
});

// --- activeBookingOnDate ----------------------------------------------------

describe("activeBookingOnDate", () => {
  it("finds an active booking on the given date, ignoring cancelled", () => {
    const bookings = [
      {
        status: "active",
        spot_label: "Z-3",
        spot_number: 3,
        expires_at: "2026-06-01T15:00:00.000Z",
      },
      {
        status: "cancelled",
        spot_label: "Z-4",
        spot_number: 4,
        expires_at: "2026-06-01T15:00:00.000Z",
      },
    ];
    expect(activeBookingOnDate(bookings, "2026-06-01")?.spot_label).toBe("Z-3");
    expect(activeBookingOnDate(bookings, "2026-06-02")).toBeUndefined();
  });
});

// --- resolveLot -------------------------------------------------------------

const LOTS = [
  { id: "l1", name: "Zunanje parkirišče" },
  { id: "l2", name: "Klet -1" },
  { id: "l3", name: "Klet -2" },
];

describe("resolveLot", () => {
  it("resolves outside aliases", () => {
    expect(resolveLot("zunaj", LOTS)?.id).toBe("l1");
    expect(resolveLot("outside", LOTS)?.id).toBe("l1");
  });

  it("resolves basement aliases", () => {
    expect(resolveLot("klet1", LOTS)?.id).toBe("l2");
    expect(resolveLot("-1", LOTS)?.id).toBe("l2");
    expect(resolveLot("b2", LOTS)?.id).toBe("l3");
  });

  it("returns undefined for an unknown building", () => {
    expect(resolveLot("garage", LOTS)).toBeUndefined();
  });
});

describe("pickRandomFree", () => {
  it("picks a free spot (skipping occupied ones)", () => {
    const spots = [
      { number: 1, label: "Z-1", status: "occupied" },
      { number: 2, label: "Z-2", status: "free" },
      { number: 3, label: "Z-3", status: "free" },
    ];
    expect(pickRandomFree(spots, () => 0)?.label).toBe("Z-2");
    expect(pickRandomFree(spots, () => 0.99)?.label).toBe("Z-3");
  });

  it("returns undefined when nothing is free", () => {
    expect(
      pickRandomFree([{ number: 1, label: "Z-1", status: "occupied" }]),
    ).toBeUndefined();
  });
});

describe("spotLink", () => {
  it("builds a public map deep-link for a spot id", () => {
    expect(spotLink("abc-123")).toBe("http://localhost:3000/?spot=abc-123");
  });
});

describe("isGrabbable", () => {
  it("allows free unowned and ACEX spots, rejects personal/occupied", () => {
    expect(
      isGrabbable({ number: 1, label: "A", status: "free", owner_id: null }),
    ).toBe(true);
    expect(
      isGrabbable({
        number: 2,
        label: "B",
        status: "free",
        owner_id: "o1",
        owner_name: "ACEX - kdor prej pride, prej melje",
      }),
    ).toBe(true);
    expect(
      isGrabbable({
        number: 3,
        label: "C",
        status: "free",
        owner_id: "o2",
        owner_name: "Maja",
      }),
    ).toBe(false);
    expect(
      isGrabbable({
        number: 4,
        label: "D",
        status: "occupied",
        owner_id: null,
      }),
    ).toBe(false);
  });
});

// --- formatters -------------------------------------------------------------

describe("formatFreeSpots", () => {
  it("lists only free spots by label", () => {
    expect(
      formatFreeSpots([
        { number: 12, label: "A12", status: "free" },
        { number: 4, label: "B04", status: "occupied" },
        { number: 9, label: "C09", status: "free" },
      ]),
    ).toBe("Free spots (2): A12, C09");
  });

  it("reports when there are no free spots", () => {
    expect(
      formatFreeSpots([{ number: 4, label: "B04", status: "occupied" }]),
    ).toBe("No free spots right now.");
  });
});

describe("formatFreeSpotsByBuilding", () => {
  it("groups free spots under their building in lot order", () => {
    const spots = [
      { number: 3, label: "Z-3", status: "free", lot_id: "l1" },
      { number: 4, label: "Z-4", status: "occupied", lot_id: "l1" },
      { number: 23, label: "K1-23", status: "free", lot_id: "l2" },
    ];
    expect(formatFreeSpotsByBuilding(spots, LOTS)).toBe(
      "Free spots (2):\n• Zunanje parkirišče (1): Z-3\n• Klet -1 (1): K1-23",
    );
  });

  it("reports when there are no free spots", () => {
    expect(formatFreeSpotsByBuilding([], LOTS)).toBe(
      "No free spots right now.",
    );
  });
});

describe("formatReserveResult", () => {
  it("confirms a successful reservation", () => {
    expect(formatReserveResult(201, {}, "A12", "2026-06-01")).toBe(
      "Reserved spot A12 for 2026-06-01.",
    );
  });

  it("includes the expiry time (Slovenian time) when provided", () => {
    expect(
      formatReserveResult(
        201,
        { expires_at: "2026-06-01T15:00:00.000Z" },
        "A12",
        "2026-06-01",
      ),
    ).toBe("Reserved spot A12 until 17:00 on 01.06.2026.");
  });

  it("reports an unavailable spot on 409", () => {
    expect(formatReserveResult(409, {}, "A12", "2026-06-01")).toBe(
      'A12 isn’t available for 2026-06-01. Type "free spots" to see open ones.',
    );
  });
});

describe("formatCancelResult", () => {
  it("confirms a cancellation", () => {
    expect(formatCancelResult(200, "A12")).toBe(
      "Cancelled your reservation on A12.",
    );
  });
});

describe("formatStatus", () => {
  it("reports nothing when no reservation and no owned spot", () => {
    expect(formatStatus([], [])).toBe(
      "You have no active reservation and no owned spot.",
    );
  });

  it("reports an active reservation", () => {
    expect(
      formatStatus(
        [{ status: "active", spot_label: "A12", spot_number: 12 }],
        [],
      ),
    ).toBe("• You have A12 reserved.");
  });

  it("includes the expiry time on an active reservation", () => {
    expect(
      formatStatus(
        [
          {
            status: "active",
            spot_label: "A12",
            spot_number: 12,
            expires_at: "2026-06-01T15:00:00.000Z",
          },
        ],
        [],
      ),
    ).toBe("• You have A12 reserved until 17:00 on 01.06.2026.");
  });

  it("reports an owned free spot and one in use by a co-owner", () => {
    const owned = [
      {
        label: "B05",
        number: 5,
        status: "free",
        active_booking_id: null,
        active_booking_reserved_by: null,
        active_booking_booked_by_owner: false,
      },
      {
        label: "B06",
        number: 6,
        status: "reserved",
        active_booking_id: "bk1",
        active_booking_reserved_by: "Maja",
        active_booking_booked_by_owner: false,
      },
    ];
    expect(formatStatus([], owned)).toBe(
      "• Your spot B05: free for you today.\n• Your spot B06: in use by Maja today.",
    );
  });
});

describe("formatHistory", () => {
  it("reports when there is no history", () => {
    expect(formatHistory([])).toBe("No booking history yet.");
  });

  it("lists the most recent bookings newest-first, capped at 5", () => {
    const bookings = [
      {
        booked_at: "2026-05-20T08:00:00Z",
        spot_label: "A1",
        spot_number: 1,
        status: "cancelled",
      },
      {
        booked_at: "2026-05-28T08:00:00Z",
        spot_label: "A2",
        spot_number: 2,
        status: "active",
      },
    ];
    expect(formatHistory(bookings)).toBe(
      "Your last 2 booking(s):\n✅ 2026-05-28 — A2\n❌ 2026-05-20 — A1",
    );
  });
});

describe("isSpotAvailableOnDate", () => {
  const DATE = "2026-06-01";
  // Resolver stubs: away = absent (free), present = taken, unknown = no presence.
  const away = () => true;
  const present = () => false;
  const unknown = () => null;
  // Per-name resolver for co-owner cases.
  const byName =
    (absent: Record<string, boolean>) =>
    (name: string): boolean | null =>
      absent[name] ?? false;

  const owned = (owner_name: string, extra = {}) => ({
    number: 1,
    label: "X1",
    status: "occupied",
    owner_id: "o",
    owner_name,
    ...extra,
  });

  it("is free when the (only) owner is absent that day", () => {
    expect(isSpotAvailableOnDate(owned("Ana"), DATE, undefined, away)).toBe(
      true,
    );
  });

  it("is taken when the owner is in office", () => {
    expect(isSpotAvailableOnDate(owned("Ana"), DATE, undefined, present)).toBe(
      false,
    );
  });

  it("is taken for a co-owned spot unless EVERY co-owner is absent", () => {
    const resolve = byName({ Ana: true, Boris: false });
    expect(
      isSpotAvailableOnDate(owned("Ana / Boris"), DATE, undefined, resolve),
    ).toBe(false);
    const allAway = byName({ Ana: true, Boris: true });
    expect(
      isSpotAvailableOnDate(owned("Ana / Boris"), DATE, undefined, allAway),
    ).toBe(true);
  });

  it("lets a per-day override win over presence", () => {
    // Owner present, but the spot was explicitly freed for the day.
    expect(isSpotAvailableOnDate(owned("Ana"), DATE, "free", present)).toBe(
      true,
    );
    // Owner away, but the spot was explicitly marked occupied for the day.
    expect(isSpotAvailableOnDate(owned("Ana"), DATE, "occupied", away)).toBe(
      false,
    );
  });

  it("counts an active booking for that day as taken, even with a free override", () => {
    expect(
      isSpotAvailableOnDate(
        owned("Ana", {
          active_booking_id: "b1",
          active_booking_expires_at: `${DATE}T15:00:00.000Z`,
        }),
        DATE,
        "free",
        away,
      ),
    ).toBe(false);
  });

  it("ignores an active booking that is for a different day", () => {
    expect(
      isSpotAvailableOnDate(
        owned("Ana", {
          active_booking_id: "b1",
          active_booking_expires_at: "2026-06-02T15:00:00.000Z",
        }),
        DATE,
        undefined,
        away,
      ),
    ).toBe(true);
  });

  it("falls back to the stored status when presence is unknown", () => {
    expect(isSpotAvailableOnDate(owned("Ana"), DATE, undefined, unknown)).toBe(
      false,
    );
    expect(
      isSpotAvailableOnDate(
        owned("Ana", { status: "free" }),
        DATE,
        undefined,
        unknown,
      ),
    ).toBe(true);
  });
});

describe("formatOwners", () => {
  // Mark a spot available iff its base status is "free" (enough to exercise the
  // icon rendering; the availability rule itself is covered above).
  const byStatus = (s: { status: string }): boolean => s.status === "free";

  it("groups owned spots by owner with a per-spot availability icon", () => {
    const spots = [
      {
        number: 12,
        label: "A12",
        status: "occupied",
        lot_id: "l1",
        owner_id: "o1",
        owner_name: "Janez Novak",
      },
      {
        number: 13,
        label: "A13",
        status: "free",
        lot_id: "l1",
        owner_id: "o1",
        owner_name: "Janez Novak",
      },
      {
        number: 23,
        label: "K1-23",
        status: "occupied",
        lot_id: "l2",
        owner_id: "o2",
        owner_name: "Mojca Kovač",
      },
    ];
    expect(formatOwners(spots, LOTS, byStatus, "today")).toBe(
      "Parking spot owners (2) — today:\n" +
        "• Janez Novak — A12 🔴, A13 🟢 (Zunanje parkirišče)\n" +
        "• Mojca Kovač — K1-23 🔴 (Klet -1)",
    );
  });

  it("shows only ACEX employees — skips unowned, the public pool, placeholders and external rentals", () => {
    const spots = [
      { number: 1, label: "Z-1", status: "free", owner_id: null },
      {
        number: 2,
        label: "Z-2",
        status: "free",
        lot_id: "l1",
        owner_id: "acex",
        owner_name: "ACEX - kdor prej pride, prej melje",
      },
      {
        number: 13,
        label: "K1-13",
        status: "occupied",
        lot_id: "l2",
        owner_id: "tesla",
        owner_name: "Tesla S",
      },
      {
        number: 16,
        label: "K1-16",
        status: "occupied",
        lot_id: "l2",
        owner_id: "mik",
        owner_name: "oddano v najem: MIK",
      },
      {
        number: 43,
        label: "K2-43",
        status: "occupied",
        lot_id: "l2",
        owner_id: "rdx",
        owner_name: "Reduxi",
      },
      {
        number: 3,
        label: "Z-3",
        status: "occupied",
        lot_id: "l1",
        owner_id: "o1",
        owner_name: "Ana Horvat",
      },
    ];
    expect(formatOwners(spots, LOTS, byStatus, "tomorrow")).toBe(
      "Parking spot owners (1) — tomorrow:\n• Ana Horvat — Z-3 🔴 (Zunanje parkirišče)",
    );
  });

  it("reports when no spot has an assigned owner", () => {
    expect(
      formatOwners(
        [{ number: 1, label: "Z-1", status: "free", owner_id: null }],
        LOTS,
        byStatus,
        "today",
      ),
    ).toBe("No parking spots have an assigned owner.");
  });
});

// --- Route: auth + help -----------------------------------------------------

const app = createApp();

describe("POST /api/integrations/rocketchat (auth + help)", () => {
  it("returns 500 when the webhook token is not configured", async () => {
    delete process.env.ROCKETCHAT_WEBHOOK_TOKEN;
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: "x", user_name: "jsernec", text: "help" });
    expect(res.status).toBe(500);
  });

  it("returns 401 when the token does not match", async () => {
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: "wrong", user_name: "jsernec", text: "help" });
    expect(res.status).toBe(401);
  });

  it("returns help text for the help command", async () => {
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "help" });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe(HELP_TEXT);
  });

  it("returns a friendly message + help for an unknown command", async () => {
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "blabla" });
    expect(res.status).toBe(200);
    expect(res.body.text).toContain("didn’t catch");
    expect(res.body.text).toContain("reserve");
  });

  it("returns a map link for the map command", async () => {
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "map" });
    expect(res.status).toBe(200);
    expect(res.body.text).toMatch(/https?:\/\//);
  });

  it("greets back on a greeting", async () => {
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "hej" });
    expect(res.status).toBe(200);
    expect(res.body.text).toContain("ParkFlowBot");
  });

  it("rejects reserve with a missing spot (usage hint, no API call)", async () => {
    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "reserve" });
    expect(res.status).toBe(200);
    expect(res.body.text.toLowerCase()).toContain("which spot");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects reserve with an invalid date (no API call)", async () => {
    const res = await request(app).post("/api/integrations/rocketchat").send({
      token: WEBHOOK_TOKEN,
      user_name: "jsernec",
      text: "reserve A12 32.13.2026",
    });
    expect(res.status).toBe(200);
    expect(res.body.text.toLowerCase()).toContain("date");
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// --- Route: loopback end-to-end --------------------------------------------

describe("POST /api/integrations/rocketchat (loopback)", () => {
  let server: Server;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    process.env.INTERNAL_API_BASE_URL = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server.close();
    delete process.env.INTERNAL_API_BASE_URL;
  });

  it("lists free spots grouped by building via loopback", async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: "s1", number: 12, label: "A12", status: "free", lot_id: "l1" },
          {
            id: "s2",
            number: 4,
            label: "B04",
            status: "occupied",
            lot_id: "l1",
          },
        ],
      }) // GET /api/spots
      .mockResolvedValueOnce({
        rows: [{ id: "l1", name: "Zunanje parkirišče" }],
      }); // GET /api/lots

    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "free spots" });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("A12");
    expect(res.body.text).toContain("Zunanje parkirišče");
  });

  it("lists spot owners with an availability icon via loopback", async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    // The route fires /api/spots, /api/lots and /api/spots/day-overrides
    // concurrently (order not guaranteed), so route the mock by SQL rather than
    // by call sequence. /api/presence is served by the stubbed fetchWeekPresence.
    // Return plain result objects (await unwraps them); avoids a
    // promise-returning mock callback, which the lint rules disallow here.
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("spot_day_status")) return { rows: [] };
      if (sql.includes("parking_lots"))
        return { rows: [{ id: "l1", name: "Zunanje parkirišče" }] };
      return {
        rows: [
          {
            id: "s1",
            number: 12,
            label: "A12",
            status: "occupied",
            lot_id: "l1",
            owner_id: "o1",
            owner_name: "Janez Novak",
            active_booking_id: null,
          },
        ],
      };
    });

    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "owners" });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Janez Novak");
    expect(res.body.text).toContain("A12");
    // No date supplied → defaults to today.
    expect(res.body.text).toContain("— today:");
    // Empty presence + occupied status → not free for others today.
    expect(res.body.text).toContain("🔴");

    // A supplied date is reflected in the header.
    const resTomorrow = await request(app)
      .post("/api/integrations/rocketchat")
      .send({
        token: WEBHOOK_TOKEN,
        user_name: "jsernec",
        text: "owners tomorrow",
      });
    expect(resTomorrow.status).toBe(200);
    expect(resTomorrow.body.text).toContain("— tomorrow:");
  });

  it("tells the user when a reserved spot does not exist", async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale (bookings/my)
      .mockResolvedValueOnce({ rows: [] }) // my bookings (no same-day conflict)
      .mockResolvedValueOnce({
        rows: [{ id: "s1", number: 12, label: "A12", status: "free" }],
      }); // GET /api/spots

    const res = await request(app).post("/api/integrations/rocketchat").send({
      token: WEBHOOK_TOKEN,
      user_name: "jsernec",
      text: "reserve X22",
    });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("X22");
    expect(res.body.text.toLowerCase()).toContain("couldn’t find");
  });

  it("warns instead of replacing when you already have a booking that day", async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    const today = new Date().toISOString().slice(0, 10);
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({
        rows: [
          {
            status: "active",
            spot_label: "Z-3",
            spot_number: 3,
            expires_at: `${today}T15:00:00.000Z`,
          },
        ],
      });

    const res = await request(app).post("/api/integrations/rocketchat").send({
      token: WEBHOOK_TOKEN,
      user_name: "jsernec",
      text: "reserve Z-9",
    });

    expect(res.status).toBe(200);
    expect(res.body.text.toLowerCase()).toContain("already have");
    expect(res.body.text).toContain("Z-3");
  });

  it("returns booking history using a minted token (write/read path)", async () => {
    process.env.ROCKETCHAT_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({
        rows: [
          {
            booked_at: "2026-05-28T08:00:00Z",
            spot_label: "A2",
            spot_number: 2,
            status: "active",
          },
        ],
      });

    const res = await request(app)
      .post("/api/integrations/rocketchat")
      .send({ token: WEBHOOK_TOKEN, user_name: "jsernec", text: "history" });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("A2");
    expect(res.body.text).toContain("Your last");
  });
});
