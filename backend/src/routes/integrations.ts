import { Router } from "express";
import jwt from "jsonwebtoken";

import type { WeekPresenceResponse } from "../lib/presence.types.js";
import type { AuthPayload } from "../middleware/auth.js";

// Rocket.Chat integration.
//
// A single Outgoing WebHook in Rocket.Chat POSTs here on every message in the
// bot channel/DM. This route is a thin translator: it verifies the shared
// token, parses the command from the message text, and calls the EXISTING
// ParkFlow REST endpoints over localhost loopback so that every booking rule
// (empty-only, per-day overrides, co-owner presence, conflicts, ownership) is
// enforced in exactly one place. No business logic is duplicated here.
//
// See docs/rocketchat-commands.md for the full command spec.

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
// Short-lived: the token only needs to live for the loopback call.
const MINTED_TOKEN_TTL = "5m";

// Working hours a chat reservation holds a spot for (Slovenian local time).
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 17;
// Human label like "07:00–17:00" — derived so messages never drift from the hours.
const WORK_HOURS_LABEL = `${String(WORK_START_HOUR).padStart(2, "0")}:00–${String(
  WORK_END_HOUR,
).padStart(2, "0")}:00`;

export const HELP_TEXT = [
  "*ParkFlow* — your parking assistant. Here's what I can do:",
  "",
  "*status* — see your current reservation and your owned spot",
  "*free spots* `[building] [today|tomorrow|dd.mm.yyyy]` — what's free (default today)",
  "      _building:_ `zunaj` · `klet1` · `klet2`",
  "      _e.g._ `free spots tomorrow` · `free spots klet1 tomorrow`",
  "*reserve* `<spot|building|any> [today|tomorrow|dd.mm.yyyy]`",
  `      Holds a spot for the working day (${WORK_HOURS_LABEL}). Give a building name or \`any\` to grab a random free one.`,
  "      _e.g._ `reserve A12` · `reserve zunaj tomorrow` · `reserve any`",
  "*cancel* `[spot]` — cancel your current reservation",
  "*history* — see your last 5 bookings",
  "*owners* `[building] [today|tomorrow|dd.mm.yyyy]` — who owns which spot (🟩 free / 🟥 taken / 🟪 maybe in — shared)",
  "*stats* `[building] [today|tomorrow|dd.mm.yyyy]` — how full parking is",
  "*peak hours* `[building]` — busiest times (last 90 days)",
  "*map* `[spot]` / *where* `<spot>` — get a map link (highlighting the spot)",
  "*help* — show this list",
  "",
  "_Dates accept_ `today`, `tomorrow` _or_ `dd.mm.yyyy`.",
  "_Buildings are_ `zunaj`, `klet1` _or_ `klet2`.",
].join("\n");

// --- Command parsing (pure, unit-tested) -----------------------------------

export type Command =
  | "help"
  | "greet"
  | "status"
  | "spots"
  | "reserve"
  | "cancel"
  | "history"
  | "map"
  | "owners"
  | "stats"
  | "peak-hours"
  | "unknown";

// Greetings the bot answers in kind (Slovenian + English).
const GREETINGS = new Set([
  "hi",
  "hey",
  "hej",
  "hello",
  "zivjo",
  "živjo",
  "zdravo",
  "servus",
  "sergus",
  "oj",
  "lp",
  "pozdrav",
  "pozdravljen",
  "pozdravljeni",
]);

// The command keyword must be the first word. "free spot(s)" → list free spots.
export function parseCommand(text: string): {
  command: Command;
  rest: string[];
} {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { command: "unknown", rest: [] };

  const w0 = (tokens[0] ?? "").toLowerCase();
  const after = (n: number): string[] => tokens.slice(n);

  if (GREETINGS.has(w0)) return { command: "greet", rest: [] };

  switch (w0) {
    case "help":
    case "info":
    case "?":
      return { command: "help", rest: [] };
    case "status":
    case "me":
      return { command: "status", rest: after(1) };
    case "spots":
    case "available":
      return { command: "spots", rest: after(1) };
    case "reserve":
    case "book":
      return { command: "reserve", rest: after(1) };
    case "history":
    case "log":
      return { command: "history", rest: after(1) };
    case "map":
    case "where":
      return { command: "map", rest: after(1) };
    case "owners":
      return { command: "owners", rest: after(1) };
    case "stats":
      return { command: "stats", rest: after(1) };
    case "peak": {
      // Single trigger phrase "peak hours" — "peak" alone isn't a command.
      if (tokens[1]?.toLowerCase() === "hours")
        return { command: "peak-hours", rest: after(2) };
      return { command: "unknown", rest: tokens };
    }
    case "cancel": {
      const rest = after(1);
      if (rest[0]?.toLowerCase() === "reservation") rest.shift();
      return { command: "cancel", rest };
    }
    case "free": {
      const w1 = tokens[1]?.toLowerCase();
      // "free spot"/"free spots" → list free spots; "free <building>" filters.
      if (w1 === "spots" || w1 === "spot")
        return { command: "spots", rest: after(2) };
      if (w1 === undefined) return { command: "spots", rest: [] };
      // "free zunaj" → list filtered by a building
      return { command: "spots", rest: after(1) };
    }
    default:
      return { command: "unknown", rest: tokens };
  }
}

// --- Date parsing (pure) ----------------------------------------------------

// The local calendar date (YYYY-MM-DD) in Slovenia for a given instant.
// Used so "today"/"tomorrow" resolve to the user's day, not the UTC day.
export function localDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Ljubljana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The Europe/Ljubljana UTC offset (minutes) at a given instant — handles CET vs
// CEST without hardcoding a fixed offset.
function ljubljanaOffsetMinutes(at: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Ljubljana",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(at))
    if (part.type !== "literal") p[part.type] = Number(part.value);
  const hour = p.hour === 24 ? 0 : (p.hour ?? 0); // some runtimes report midnight as 24
  const asUTC = Date.UTC(
    p.year ?? 0,
    (p.month ?? 1) - 1,
    p.day ?? 1,
    hour,
    p.minute ?? 0,
    p.second ?? 0,
  );
  return (asUTC - at.getTime()) / 60_000;
}

// Convert a wall-clock hour on a local Slovenian date (YYYY-MM-DD) to a UTC ISO
// instant. DST switches happen overnight, so a single offset correction is safe
// for working-hours times like 09:00/17:00.
export function ljubljanaInstant(date: string, hour: number): string {
  const hh = String(hour).padStart(2, "0");
  const naive = new Date(`${date}T${hh}:00:00.000Z`);
  const offsetMin = ljubljanaOffsetMinutes(naive);
  return new Date(naive.getTime() - offsetMin * 60_000).toISOString();
}

// True when `date` is today (Slovenian) and the working day (ends 17:00) is
// already over — no point holding a spot that would expire immediately.
export function workDayOver(date: string, now: Date): boolean {
  return (
    date === localDate(now) &&
    now.getTime() >= new Date(ljubljanaInstant(date, WORK_END_HOUR)).getTime()
  );
}

// Returns YYYY-MM-DD, or null if the token is present but not a valid date.
// Undefined token defaults to today (local Slovenian day).
export function parseDate(token: string | undefined, now: Date): string | null {
  if (!token) return localDate(now);
  const t = token.toLowerCase();
  if (t === "today") return localDate(now);
  if (t === "tomorrow") return addDays(localDate(now), 1);

  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(token);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

// --- Building/lot aliases (pure) -------------------------------------------

export interface Lot {
  id: string;
  name: string;
}

const LOT_ALIASES: Record<string, string[]> = {
  "Zunanje parkirišče": ["outside", "out", "zunaj", "zunanje"],
  "Klet -1": ["-1", "k-1", "klet-1", "klet1", "basement1", "b1"],
  "Klet -2": ["-2", "k-2", "klet-2", "klet2", "basement2", "b2"],
};

export function resolveLot(token: string, lots: Lot[]): Lot | undefined {
  const t = token.toLowerCase();
  return lots.find((lot) => {
    if (lot.name.toLowerCase() === t) return true;
    return (LOT_ALIASES[lot.name] ?? []).includes(t);
  });
}

// Pick a random free spot from a list. `rand` is injectable for tests.
export function pickRandomFree(
  spots: SpotLike[],
  rand: () => number = Math.random,
): SpotLike | undefined {
  const free = spots.filter((s) => s.status === "free");
  if (free.length === 0) return undefined;
  return free[Math.floor(rand() * free.length)];
}

// The ACEX company pool ("first come, first served") — public, not a personal spot.
const ACEX_OWNER_NAME = "ACEX - kdor prej pride, prej melje";

// Owner rows that are NOT ACEX employees — the public pool, placeholders/
// vehicles, and external companies/rentals. The `owners` roster lists only real
// ACEX staff, so these are filtered out. There is no DB flag for this, so the
// list is maintained by hand: add new external/placeholder owner names here as
// they are created (see migrations/005_real_parking_data.sql for the seed set).
const NOT_ACEX_OWNERS = new Set<string>([
  ACEX_OWNER_NAME,
  "kontejner - prenova",
  "Tesla S",
  "Tesla X",
  "oddano v najem: MIK",
  "ARHEA",
  "Reduxi",
]);

// A spot anyone can grab without taking someone's personal/shared spot:
// free, and either unowned or part of the ACEX public pool.
export function isGrabbable(s: SpotLike): boolean {
  return (
    s.status === "free" && (!s.owner_id || s.owner_name === ACEX_OWNER_NAME)
  );
}

// --- Formatters (pure) ------------------------------------------------------

export interface SpotLike {
  id?: string;
  number: number;
  label: string | null;
  status: string;
  lot_id?: string;
  owner_id?: string | null;
  owner_name?: string | null;
  active_booking_id?: string | null;
  active_booking_expires_at?: string | null;
}

// A per-day status override for one spot (from GET /api/spots/day-overrides).
export interface DayOverride {
  spot_id: string;
  date: string;
  status: string;
}

export interface OwnedSpotLike {
  id?: string;
  number: number;
  label: string | null;
  status: string;
  lot_name?: string;
  active_booking_id: string | null;
  active_booking_reserved_by: string | null;
  active_booking_booked_by_owner: boolean;
}

export interface BookingLike {
  id?: string;
  spot_number: number;
  spot_label: string | null;
  status: string;
  booked_at?: string;
  expires_at?: string;
  building?: string;
}

function spotLabel(s: { number: number; label: string | null }): string {
  return s.label ?? `#${s.number}`;
}

// Format an ISO timestamp as "HH:MM on DD.MM.YYYY" in local (Slovenian) time.
function formatUntil(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Ljubljana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(iso)))
    p[part.type] = part.value;
  return `${p.hour}:${p.minute} on ${p.day}.${p.month}.${p.year}`;
}

function bookingLabel(b: BookingLike): string {
  return b.spot_label ?? `#${b.spot_number}`;
}

// Find an active booking that falls on the given date (matches how the backend
// derives a booking's day from expires_at). Used to warn before re-reserving.
export function activeBookingOnDate(
  bookings: BookingLike[],
  date: string,
): BookingLike | undefined {
  return bookings.find(
    (b) => b.status === "active" && (b.expires_at ?? "").slice(0, 10) === date,
  );
}

// Decide which active booking a "cancel" command refers to. `rest` may hold a
// spot label and/or a date token (today/tomorrow/dd.mm.yyyy), in any order:
// "cancel", "cancel A12", "cancel today", "cancel A12 tomorrow". Without this,
// a date token like "today" was mistaken for a spot label. Pure + unit-tested.
export type CancelSelection =
  | { kind: "target"; booking: BookingLike }
  | { kind: "ambiguous"; active: BookingLike[] }
  | { kind: "none"; spotName?: string; date?: string };

export function selectCancelTarget(
  bookings: BookingLike[],
  rest: string[],
  now: Date,
): CancelSelection {
  let dateArg: string | undefined;
  let spotName: string | undefined;
  for (const tok of rest) {
    if (dateArg === undefined && parseDate(tok, now) !== null) dateArg = tok;
    else spotName ??= tok;
  }
  const date = dateArg ? (parseDate(dateArg, now) ?? undefined) : undefined;

  let active = bookings.filter((b) => b.status === "active");
  if (date)
    active = active.filter((b) => (b.expires_at ?? "").slice(0, 10) === date);

  let booking: BookingLike | undefined;
  if (spotName !== undefined) {
    const needle = spotName;
    const lower = needle.toLowerCase();
    booking = active.find(
      (b) =>
        b.spot_label?.toLowerCase() === lower ||
        String(b.spot_number) === needle,
    );
  } else if (active.length === 1) {
    booking = active[0];
  } else if (active.length > 1) {
    return { kind: "ambiguous", active };
  }
  if (booking?.id) return { kind: "target", booking };
  return { kind: "none", spotName, date };
}

// `spots` is the already-available list (the caller filters via
// spotStatusOnDate); `when` is the day label (today / tomorrow / DD.MM.YYYY).
export function formatFreeSpots(spots: SpotLike[], when: string): string {
  if (spots.length === 0) return `No free spots for ${when}.`;
  return `Free spots (${spots.length}) — ${when}: ${spots
    .map(spotLabel)
    .join(", ")}`;
}

// Group the given (already-available) spots by building, in the given lot order.
export function formatFreeSpotsByBuilding(
  spots: SpotLike[],
  lots: Lot[],
  when: string,
): string {
  if (spots.length === 0) return `No free spots for ${when}.`;

  const lines: string[] = [];
  const grouped = new Set<SpotLike>();
  for (const lot of lots) {
    const inLot = spots.filter((s) => s.lot_id === lot.id);
    inLot.forEach((s) => grouped.add(s));
    if (inLot.length > 0) {
      lines.push(
        `• ${lot.name} (${inLot.length}): ${inLot.map(spotLabel).join(", ")}`,
      );
    }
  }
  const other = spots.filter((s) => !grouped.has(s));
  if (other.length > 0) {
    lines.push(`• Other (${other.length}): ${other.map(spotLabel).join(", ")}`);
  }
  return `Free spots (${spots.length}) — ${when}:\n${lines.join("\n")}`;
}

// A spot's effective availability for a day, from the owners-list point of view.
export type SpotDayStatus = "free" | "taken" | "unconfirmed";

// How an owner reads on the timesheet for a given day.
export type OwnerPresence = "in_office" | "absent" | "unknown";

// Icons shown after each spot label in the `owners` list. Squares (not circles):
// the colour-circle emojis are from different Unicode generations and render at
// mismatched sizes in Rocket.Chat; 🟩/🟥/🟪 are a matched set (same size).
const SPOT_STATUS_ICON: Record<SpotDayStatus, string> = {
  free: "🟩", // free for someone else to use that day
  taken: "🟥", // a co-owner is in / spot is otherwise occupied or reserved
  unconfirmed: "🟪", // shared spot, 2+ co-owners may be in — can't tell who
};

// Effective availability of `spot` for `date`, mirroring the frontend's
// useEffectiveSpots: an active booking for that day or an 'occupied' override →
// taken; a 'free' override → free; otherwise count the co-owners in office that
// day — 0 → free, 1 → taken (occupied), 2+ → unconfirmed (the PP signal can't
// pick one). `overrideStatus` is the spot's spot_day_status for `date`, if any.
// `ownerPresence(name)` returns in_office / absent / unknown. Falls back to the
// stored status when no co-owner has presence data.
export function spotStatusOnDate(
  spot: SpotLike,
  date: string,
  overrideStatus: string | undefined,
  ownerPresence: (ownerName: string) => OwnerPresence,
): SpotDayStatus {
  const baseFallback: SpotDayStatus = spot.status === "free" ? "free" : "taken";

  // An active booking for that day → taken, regardless of everything else.
  if (
    spot.active_booking_id &&
    (spot.active_booking_expires_at ?? "").slice(0, 10) === date
  ) {
    return "taken";
  }
  // A per-day override is authoritative ('occupied' reads as taken).
  if (overrideStatus !== undefined) {
    return overrideStatus === "free" ? "free" : "taken";
  }
  // The ACEX public pool is always free (normally filtered out of this list).
  if (spot.owner_name === ACEX_OWNER_NAME) return "free";
  // Owned spot: decide from how many co-owners are in office that day.
  if (spot.owner_name) {
    const ownerNames = spot.owner_name
      .split("/")
      .map((n) => n.trim())
      .filter(Boolean);
    if (ownerNames.length === 0) return baseFallback;
    const presences = ownerNames.map((n) => ownerPresence(n));
    // No presence data for any co-owner → fall back to the stored status.
    if (presences.every((p) => p === "unknown")) return baseFallback;
    const inOffice = presences.filter((p) => p === "in_office").length;
    if (inOffice >= 2) return "unconfirmed";
    if (inOffice === 1) return "taken";
    return "free";
  }
  // Unowned spot.
  return baseFallback;
}

// /api/spots returns one row per active booking, so a spot with bookings on
// several days appears multiple times. Collapse to one row per spot id — keeping
// the row whose active booking falls on `date` so the status reflects that day —
// mirroring the frontend's useEffectiveSpots dedup. Rows without an id are kept
// as-is (can't be deduped). Used by counting commands (stats, owners) so a
// multiply-booked spot isn't tallied more than once.
export function dedupeSpotsForDate(
  spots: SpotLike[],
  date: string,
): SpotLike[] {
  const onDate = (s: SpotLike): boolean =>
    (s.active_booking_expires_at ?? "").slice(0, 10) === date;
  const byId = new Map<string, SpotLike>();
  const noId: SpotLike[] = [];
  for (const s of spots) {
    if (!s.id) {
      noId.push(s);
      continue;
    }
    const existing = byId.get(s.id);
    if (!existing || (onDate(s) && !onDate(existing))) byId.set(s.id, s);
  }
  return [...byId.values(), ...noId];
}

// Build an owner-name → in_office / absent / unknown resolver for `date` from a
// week of timesheet presence, mirroring useEffectiveSpots: parking_available →
// absent, else in_office; a work-free day frees every employee; an owner not on
// the timesheet (or with no entry that day) is unknown — so it never counts as
// in office. Returns "unknown" for everyone when presence is unavailable.
function makeOwnerPresence(
  presence: WeekPresenceResponse | null,
  date: string,
): (ownerName: string) => OwnerPresence {
  return (name: string): OwnerPresence => {
    if (!presence) return "unknown";
    const entry = presence.employees.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    if (!entry) return "unknown";
    if (presence.work_free_days.includes(date)) return "absent";
    const day = entry.week.find((d) => d.date === date);
    if (!day) return "unknown";
    return day.parking_available ? "absent" : "in_office";
  };
}

// A human label for a date relative to now: "today", "tomorrow", or DD.MM.YYYY.
export function dayLabel(date: string, now: Date): string {
  if (date === localDate(now)) return "today";
  if (date === addDays(localDate(now), 1)) return "tomorrow";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

// List every ACEX-employee-owned spot grouped by its owner. Skips unowned spots
// and any non-employee owner (public pool, placeholders/vehicles, external
// rentals — see NOT_ACEX_OWNERS). Each spot label carries an availability icon
// for `when` (🟩 free / 🟥 taken / 🟪 unconfirmed), per `statusOf`. When all of an
// owner's spots sit in one building, that building is shown in parentheses —
// unless `building` is set (a building filter), in which case the scope is named
// in the header and the redundant per-owner suffix is omitted. The caller is
// expected to have already restricted `spots` to that building.
export function formatOwners(
  spots: SpotLike[],
  lots: Lot[],
  statusOf: (spot: SpotLike) => SpotDayStatus,
  when: string,
  building?: string,
): string {
  const lotName = new Map(lots.map((l) => [l.id, l.name]));
  const owned = spots.filter(
    (s) => s.owner_id && s.owner_name && !NOT_ACEX_OWNERS.has(s.owner_name),
  );
  if (owned.length === 0) {
    return building
      ? `No assigned parking spots in ${building}.`
      : "No parking spots have an assigned owner.";
  }

  const byOwner = new Map<string, SpotLike[]>();
  for (const s of owned) {
    const list = byOwner.get(s.owner_name!) ?? [];
    list.push(s);
    byOwner.set(s.owner_name!, list);
  }

  const lines = [...byOwner.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const ownedSpots = byOwner.get(name)!.sort((a, b) => a.number - b.number);
      const labels = ownedSpots
        .map((s) => `${spotLabel(s)} ${SPOT_STATUS_ICON[statusOf(s)]}`)
        .join(", ");
      // With a building filter the scope is already in the header, so skip the
      // redundant per-owner building suffix.
      const buildings = building
        ? []
        : [
            ...new Set(
              ownedSpots
                .map((s) => (s.lot_id ? lotName.get(s.lot_id) : undefined))
                .filter((n): n is string => Boolean(n)),
            ),
          ];
      const where = buildings.length === 1 ? ` (${buildings[0]})` : "";
      return `• ${name} — ${labels}${where}`;
    });

  const scope = building ? ` in ${building}` : "";
  return `Parking spot owners${scope} (${byOwner.size}) — ${when}:\n${lines.join("\n")}`;
}

// Percentage of n out of total, rounded; 0 when total is 0.
function computePct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

// Live occupancy snapshot for `when`. Counts every spot via `statusOf` (free vs
// not-free); reports an overall figure plus a per-building breakdown, or a
// single figure when `building` scopes the list. `spots` is assumed already
// restricted to `building` when set.
export function formatOccupancy(
  spots: SpotLike[],
  lots: Lot[],
  statusOf: (spot: SpotLike) => SpotDayStatus,
  when: string,
  building?: string,
): string {
  if (spots.length === 0) {
    return building
      ? `No parking spots in ${building}.`
      : "No parking spots found.";
  }
  const isFree = (s: SpotLike): boolean => statusOf(s) === "free";
  const scope = building ? ` in ${building}` : "";
  const header = `Parking occupancy${scope} — ${when}:`;

  const total = spots.length;
  const free = spots.filter(isFree).length;
  const overall = `${computePct(total - free, total)}% full — ${free} of ${total} free`;
  if (building) return `${header}\n• ${overall}`;

  const lines = [`• Overall: ${overall}`];
  for (const lot of lots) {
    const inLot = spots.filter((s) => s.lot_id === lot.id);
    if (inLot.length === 0) continue;
    const lotFree = inLot.filter(isFree).length;
    lines.push(
      `• ${lot.name}: ${computePct(inLot.length - lotFree, inLot.length)}% full (${lotFree}/${inLot.length} free)`,
    );
  }
  return `${header}\n${lines.join("\n")}`;
}

// One occupancy tally for a (weekday, hour) bucket from GET /api/stats/history.
export interface HeatmapCell {
  weekday: number; // 0 = Sunday … 6 = Saturday (Postgres DOW)
  hour: number; // 0–23
  count: number;
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function hourLabel(h: number): string {
  return `${String(((h % 24) + 24) % 24).padStart(2, "0")}:00`;
}

// Summarise the occupancy heatmap into the peak demand bucket, busiest weekday,
// and busiest hour overall. `building` is shown in the header when scoped.
export function formatPeakHours(
  heatmap: HeatmapCell[],
  building?: string,
): string {
  const cells = heatmap.filter((c) => c.count > 0);
  if (cells.length === 0) {
    return building
      ? `No historical parking data yet for ${building}.`
      : "No historical parking data yet.";
  }

  const peak = cells.reduce((a, b) => (b.count > a.count ? b : a));

  const byHour = new Map<number, number>();
  const byDay = new Map<number, number>();
  for (const c of cells) {
    byHour.set(c.hour, (byHour.get(c.hour) ?? 0) + c.count);
    byDay.set(c.weekday, (byDay.get(c.weekday) ?? 0) + c.count);
  }
  const busiestHour = [...byHour.entries()].reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];
  const busiestDay = [...byDay.entries()].reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  const scope = building ? ` · ${building}` : "";
  return [
    `Busiest parking times — last 90 days${scope}:`,
    `• Peak: ${WEEKDAY_NAMES[peak.weekday]} around ${hourLabel(peak.hour)}`,
    `• Busiest day: ${WEEKDAY_NAMES[busiestDay]}`,
    `• Busiest hour: ${hourLabel(busiestHour)}–${hourLabel(busiestHour + 1)}`,
  ].join("\n");
}

export function formatReserveResult(
  status: number,
  body: { error?: string; expires_at?: string },
  label: string,
  date: string,
  building?: string,
): string {
  const where = building ? ` in ${building}` : "";
  if (status === 201)
    return body.expires_at
      ? `Reserved spot ${label}${where} until ${formatUntil(body.expires_at)}.`
      : `Reserved spot ${label}${where} for ${date}.`;
  if (status === 409)
    return `${label} isn’t available for ${date}. Type "free spots" to see open ones.`;
  if (status === 404) return `Spot ${label} not found.`;
  if (status === 403) return `You’re not allowed to reserve ${label}.`;
  return body.error
    ? `Could not reserve ${label}: ${body.error}`
    : `Could not reserve ${label}.`;
}

export function formatCancelResult(status: number, label: string): string {
  if (status === 200) return `Cancelled your reservation on ${label}.`;
  return `Could not cancel ${label}.`;
}

export function formatStatus(
  bookings: BookingLike[],
  owned: OwnedSpotLike[],
): string {
  const lines: string[] = [];
  for (const b of bookings) {
    if (b.status === "active") {
      const where = b.building ? ` (${b.building})` : "";
      const until = b.expires_at ? ` until ${formatUntil(b.expires_at)}` : "";
      lines.push(`• You have ${bookingLabel(b)}${where} reserved${until}.`);
    }
  }
  for (const s of owned) {
    const label = spotLabel(s);
    const where = s.lot_name ? ` (${s.lot_name})` : "";
    if (s.active_booking_id) {
      lines.push(
        s.active_booking_booked_by_owner
          ? `• Your spot ${label}${where}: reserved by you.`
          : `• Your spot ${label}${where}: in use by ${s.active_booking_reserved_by ?? "someone"} today.`,
      );
    } else if (s.status === "free") {
      lines.push(`• Your spot ${label}${where}: free for you today.`);
    } else {
      lines.push(`• Your spot ${label}${where}: ${s.status}.`);
    }
  }
  if (lines.length === 0)
    return "You have no active reservation and no owned spot.";
  return lines.join("\n");
}

const STATUS_ICON: Record<string, string> = {
  active: "✅",
  cancelled: "❌",
  expired: "⏰",
};

export function formatHistory(bookings: BookingLike[]): string {
  if (bookings.length === 0) return "No booking history yet.";
  const sorted = [...bookings].sort((a, b) =>
    (a.booked_at ?? "") < (b.booked_at ?? "") ? 1 : -1,
  );
  const top = sorted.slice(0, 5);
  const lines = top.map((b) => {
    const icon = STATUS_ICON[b.status] ?? "•";
    return `${icon} ${(b.booked_at ?? "").slice(0, 10)} — ${bookingLabel(b)}`;
  });
  return `Your last ${lines.length} booking(s):\n${lines.join("\n")}`;
}

// --- Loopback to the existing REST API -------------------------------------

function internalBase(): string {
  return (
    process.env.INTERNAL_API_BASE_URL ??
    `http://127.0.0.1:${process.env.PORT ?? 3001}`
  );
}

// Public URL of the ParkFlow frontend, used to build clickable map deep-links.
function frontendBase(): string {
  return (process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

// Link that opens the public map highlighting a specific spot. Pass `date`
// (YYYY-MM-DD) to also open the map on that day — used for reservations made
// for a future day so the link doesn't land the user on today's map.
export function spotLink(spotId: string, date?: string): string {
  const params = new URLSearchParams({ spot: spotId });
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  return `${frontendBase()}/?${params.toString()}`;
}

function mintUserToken(username: string): string {
  const payload: AuthPayload = {
    // Authentik "subject mode" = username, so sub === username. A chat-minted
    // identity is therefore identical to a UI login for the same person.
    userId: username,
    username,
    displayName: username,
    role: "user",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: MINTED_TOKEN_TTL });
}

async function call<T = unknown>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<{ status: number; data: T | null }> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(internalBase() + path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    // empty / non-JSON body
  }
  return { status: res.status, data };
}

// Like call(), but always resolves to an array — empty if the endpoint errored
// or returned a non-array body. Keeps list handling crash-free.
async function callArray<T>(
  method: string,
  path: string,
  opts: { token?: string } = {},
): Promise<T[]> {
  const { data } = await call<T[]>(method, path, opts);
  return Array.isArray(data) ? data : [];
}

function matchesLabel(
  s: { label: string | null; number: number },
  arg: string,
): boolean {
  return (
    s.label?.toLowerCase() === arg.toLowerCase() || String(s.number) === arg
  );
}

// Map of lot id → building name, for showing where a spot is.
async function lotNameMap(): Promise<Map<string, string>> {
  const lots = await callArray<Lot>("GET", "/api/lots");
  return new Map(lots.map((l) => [l.id, l.name]));
}

// --- Route -----------------------------------------------------------------

router.post("/rocketchat", async (req, res, next) => {
  try {
    const expected = process.env.ROCKETCHAT_WEBHOOK_TOKEN;
    if (!expected) {
      res
        .status(500)
        .json({ text: "Rocket.Chat integration is not configured." });
      return;
    }

    const body = req.body as {
      token?: string;
      user_name?: string;
      text?: string;
    };
    if (body.token !== expected) {
      res.status(401).json({ text: "Unauthorized." });
      return;
    }

    const { command, rest } = parseCommand(body.text ?? "");
    const username = body.user_name;
    const now = new Date();
    const reply = (text: string): void => {
      res.status(200).json({ text });
    };
    const needUser = (): boolean => {
      if (!username) {
        reply("I could not identify you.");
        return false;
      }
      return true;
    };

    switch (command) {
      case "help":
        reply(HELP_TEXT);
        return;

      case "greet":
        reply(
          "👋 Hi! I’m *ParkFlowBot* — I help you find and reserve parking. Type `help` to see everything I can do.",
        );
        return;

      case "map": {
        const arg = rest[0];
        if (!arg) {
          reply(`Open the parking map: ${frontendBase()}/`);
          return;
        }
        const spots = await callArray<SpotLike>("GET", "/api/spots");
        const spot = spots.find((s) => matchesLabel(s, arg));
        if (!spot?.id) {
          reply(`I couldn’t find spot ${arg}. Type "free spots" to see them.`);
          return;
        }
        reply(
          `📍 ${spot.label ?? `#${spot.number}`}: ${spotLink(spot.id, localDate(now))}`,
        );
        return;
      }

      case "spots": {
        // `free spots [building] [date]` — real availability for a day, not just
        // live status. Mirrors the `owners` command: same sources, same
        // spotStatusOnDate rule. Tokens are order-independent.
        const lots = await callArray<Lot>("GET", "/api/lots");

        let date: string | null = null;
        let lot: Lot | undefined;
        for (const token of rest) {
          const parsed = parseDate(token, now);
          if (parsed !== null) {
            date ??= parsed;
            continue;
          }
          const matched = resolveLot(token, lots);
          if (matched) {
            lot ??= matched;
            continue;
          }
          reply(
            `I don’t understand "${token}". Use a building (zunaj, klet1, klet2) ` +
              `or a date (today, tomorrow, dd.mm.yyyy).`,
          );
          return;
        }

        const targetDate = date ?? localDate(now);
        const when = dayLabel(targetDate, now);

        const [spots, overrides, presenceRes] = await Promise.all([
          callArray<SpotLike>(
            "GET",
            lot ? `/api/spots?lot_id=${lot.id}` : "/api/spots",
          ),
          callArray<DayOverride>(
            "GET",
            `/api/spots/day-overrides?date=${targetDate}`,
          ),
          call<WeekPresenceResponse>("GET", `/api/presence?date=${targetDate}`),
        ]);
        const overrideBySpot = new Map(
          overrides.map((o) => [o.spot_id, o.status]),
        );
        // Presence unavailable (timesheet API down) → resolver returns "unknown"
        // and spotStatusOnDate falls back to the spot's stored status. Dedup
        // first so a multiply-booked spot isn't listed more than once.
        const presence = presenceRes.status === 200 ? presenceRes.data : null;
        const ownerPresence = makeOwnerPresence(presence, targetDate);
        const available = dedupeSpotsForDate(spots, targetDate).filter(
          (s) =>
            spotStatusOnDate(
              s,
              targetDate,
              s.id ? overrideBySpot.get(s.id) : undefined,
              ownerPresence,
            ) === "free",
        );

        // Without presence, owner-occupied spots may be wrongly omitted — flag
        // it rather than implying the list is complete.
        const note =
          presence === null
            ? "\n⚠️ List may be incomplete — I couldn’t check owner spots right now."
            : "";

        reply(
          lot
            ? `${lot.name} — ${formatFreeSpots(available, when)}${note}`
            : `${formatFreeSpotsByBuilding(available, lots, when)}${note}`,
        );
        return;
      }

      case "owners": {
        // Public read (no auth) — lists who owns which spot, grouped by owner,
        // with a per-day availability icon. Optional args, in any order: a
        // building filter (zunaj/klet1/klet2) and/or a date (default today).
        // Pulls that day's per-day overrides and presence so the icon reflects
        // real availability (owner away / freed), mirroring useEffectiveSpots.
        const [lots, spots] = await Promise.all([
          callArray<Lot>("GET", "/api/lots"),
          callArray<SpotLike>("GET", "/api/spots"),
        ]);
        let date = localDate(now);
        let lotFilter: Lot | undefined;
        for (const tok of rest) {
          const lot = resolveLot(tok, lots);
          if (lot) {
            lotFilter = lot;
            continue;
          }
          const parsed = parseDate(tok, now);
          if (parsed !== null) {
            date = parsed;
            continue;
          }
          reply(
            `I didn’t understand "${tok}". Use a building (zunaj, klet1, klet2) and/or a date (today, tomorrow, dd.mm.yyyy).`,
          );
          return;
        }
        const [overrides, presenceRes] = await Promise.all([
          callArray<DayOverride>(
            "GET",
            `/api/spots/day-overrides?date=${date}`,
          ),
          call<WeekPresenceResponse>("GET", `/api/presence?date=${date}`),
        ]);
        const overrideBySpot = new Map(
          overrides.map((o) => [o.spot_id, o.status]),
        );
        // If presence is unavailable (timesheet API down), the resolver returns
        // "unknown" and spotStatusOnDate falls back to the stored status.
        const presence = presenceRes.status === 200 ? presenceRes.data : null;
        const ownerPresence = makeOwnerPresence(presence, date);
        const statusOf = (s: SpotLike): SpotDayStatus =>
          spotStatusOnDate(
            s,
            date,
            s.id ? overrideBySpot.get(s.id) : undefined,
            ownerPresence,
          );
        const lot = lotFilter;
        const unique = dedupeSpotsForDate(spots, date);
        const scoped = lot ? unique.filter((s) => s.lot_id === lot.id) : unique;
        reply(
          formatOwners(scoped, lots, statusOf, dayLabel(date, now), lot?.name),
        );
        return;
      }

      case "stats": {
        // Public read — live occupancy snapshot. Optional building filter and/or
        // date (any order, default today), computed with the same presence-aware
        // effective status as the owners command.
        const [lots, spots] = await Promise.all([
          callArray<Lot>("GET", "/api/lots"),
          callArray<SpotLike>("GET", "/api/spots"),
        ]);
        let date = localDate(now);
        let lotFilter: Lot | undefined;
        for (const tok of rest) {
          const lot = resolveLot(tok, lots);
          if (lot) {
            lotFilter = lot;
            continue;
          }
          const parsed = parseDate(tok, now);
          if (parsed !== null) {
            date = parsed;
            continue;
          }
          reply(
            `I didn’t understand "${tok}". Use a building (zunaj, klet1, klet2) and/or a date (today, tomorrow, dd.mm.yyyy).`,
          );
          return;
        }
        const [overrides, presenceRes] = await Promise.all([
          callArray<DayOverride>(
            "GET",
            `/api/spots/day-overrides?date=${date}`,
          ),
          call<WeekPresenceResponse>("GET", `/api/presence?date=${date}`),
        ]);
        const overrideBySpot = new Map(
          overrides.map((o) => [o.spot_id, o.status]),
        );
        const presence = presenceRes.status === 200 ? presenceRes.data : null;
        const ownerPresence = makeOwnerPresence(presence, date);
        const statusOf = (s: SpotLike): SpotDayStatus =>
          spotStatusOnDate(
            s,
            date,
            s.id ? overrideBySpot.get(s.id) : undefined,
            ownerPresence,
          );
        const lot = lotFilter;
        const unique = dedupeSpotsForDate(spots, date);
        const scoped = lot ? unique.filter((s) => s.lot_id === lot.id) : unique;
        reply(
          formatOccupancy(
            scoped,
            lots,
            statusOf,
            dayLabel(date, now),
            lot?.name,
          ),
        );
        return;
      }

      case "peak-hours": {
        // Public read — busiest times from the historical occupancy heatmap.
        // Optional building filter; no date (the heatmap covers ~90 days).
        const tok = rest[0];
        let lotFilter: Lot | undefined;
        if (tok) {
          lotFilter = resolveLot(tok, await callArray<Lot>("GET", "/api/lots"));
          if (!lotFilter) {
            reply(
              `I don’t know the building "${tok}". Try: zunaj, klet1, klet2.`,
            );
            return;
          }
        }
        const path = lotFilter
          ? `/api/stats/history?lot_id=${lotFilter.id}`
          : "/api/stats/history";
        const { data } = await call<{ heatmap: HeatmapCell[] }>("GET", path);
        reply(formatPeakHours(data?.heatmap ?? [], lotFilter?.name));
        return;
      }

      case "reserve": {
        const spotName = rest[0];
        if (!spotName) {
          reply(
            'Which spot? e.g. "reserve A12" (optionally "reserve A12 tomorrow").',
          );
          return;
        }
        if (!needUser()) return;
        const dateArg = rest[1];
        const date = parseDate(dateArg, now);
        if (date === null) {
          reply(
            `I didn’t understand the date "${dateArg ?? ""}". Use today, tomorrow, or dd.mm.yyyy.`,
          );
          return;
        }
        if (date < localDate(now)) {
          reply("That date is in the past — pick today or later.");
          return;
        }
        // No working time left today (past 17:00) — refuse rather than create a
        // reservation that would expire the moment it's made.
        if (workDayOver(date, now)) {
          reply(
            `No working time left today — reservations run ${WORK_HOURS_LABEL}. Try "reserve … tomorrow".`,
          );
          return;
        }
        // Warn instead of silently replacing: you can hold one spot per day.
        const reserveToken = mintUserToken(username!);
        const myBookings = await callArray<BookingLike>(
          "GET",
          "/api/bookings/my",
          { token: reserveToken },
        );
        const existing = activeBookingOnDate(myBookings, date);
        if (existing) {
          reply(
            `You already have ${bookingLabel(existing)} reserved for ${date}. ` +
              `Cancel it first ("cancel ${bookingLabel(existing)}") before reserving another.`,
          );
          return;
        }
        const spots = await callArray<SpotLike>("GET", "/api/spots");
        let spot: SpotLike | undefined;
        if (spotName.toLowerCase() === "any") {
          // "reserve any" — grab any free, non-personal/non-shared spot.
          spot = pickRandomFree(spots.filter(isGrabbable));
          if (!spot) {
            reply("No free spots available to grab right now.");
            return;
          }
        } else {
          spot = spots.find((s) => matchesLabel(s, spotName));
          if (!spot) {
            // Not a spot label — maybe it's a building name. If so, pick a
            // random free spot in that building (e.g. "reserve zunaj").
            const lot = resolveLot(
              spotName,
              await callArray<Lot>("GET", "/api/lots"),
            );
            if (lot) {
              // Only grab public spots in that building, not someone's personal one.
              spot = pickRandomFree(
                spots.filter((s) => s.lot_id === lot.id && isGrabbable(s)),
              );
              if (!spot) {
                reply(`No free spots to grab in ${lot.name} right now.`);
                return;
              }
            }
          }
        }
        if (!spot?.id) {
          reply(
            `I couldn’t find spot ${spotName}. Type "free spots" to see what’s available.`,
          );
          return;
        }
        // Every reservation holds the spot for the working day (09:00–17:00
        // Slovenian time), regardless of when it was created or which day it's
        // for — so a 00:11 booking no longer expires at 08:11.
        const reserveBody: {
          spot_id: string;
          starts_at: string;
          expires_at: string;
        } = {
          spot_id: spot.id,
          starts_at: ljubljanaInstant(date, WORK_START_HOUR),
          expires_at: ljubljanaInstant(date, WORK_END_HOUR),
        };
        const { status, data } = await call<{ error?: string }>(
          "POST",
          "/api/bookings",
          { token: reserveToken, body: reserveBody },
        );
        let building: string | undefined;
        if (status === 201 && spot.lot_id) {
          building = (await lotNameMap()).get(spot.lot_id);
        }
        const reserveMsg = formatReserveResult(
          status,
          data ?? {},
          spot.label ?? spotName,
          date,
          building,
        );
        // Deep-link to the reserved day. Always include the date — even today —
        // so the link can't reopen on a stale localStorage day in the browser.
        reply(
          status === 201
            ? `${reserveMsg}\n📍 See it on the map: ${spotLink(spot.id, date)}`
            : reserveMsg,
        );
        return;
      }

      case "cancel": {
        if (!needUser()) return;
        const token = mintUserToken(username!);
        const bookings = await callArray<BookingLike>(
          "GET",
          "/api/bookings/my",
          { token },
        );
        const selection = selectCancelTarget(bookings, rest, now);
        if (selection.kind === "ambiguous") {
          reply(
            `You have ${selection.active.length} reservations. Say e.g. "cancel ${bookingLabel(selection.active[0]!)}".`,
          );
          return;
        }
        if (selection.kind === "none") {
          const when = selection.date
            ? dayLabel(selection.date, now)
            : undefined;
          reply(
            selection.spotName
              ? `You don’t have a reservation on ${selection.spotName}${when ? ` for ${when}` : ""}.`
              : when
                ? `You have no active reservation for ${when} to cancel.`
                : "You have no active reservation to cancel.",
          );
          return;
        }
        const { status } = await call(
          "PATCH",
          `/api/bookings/${selection.booking.id}/cancel`,
          { token },
        );
        reply(formatCancelResult(status, bookingLabel(selection.booking)));
        return;
      }

      case "history": {
        if (!needUser()) return;
        const bookings = await callArray<BookingLike>(
          "GET",
          "/api/bookings/my",
          { token: mintUserToken(username!) },
        );
        reply(formatHistory(bookings));
        return;
      }

      case "status": {
        if (!needUser()) return;
        const token = mintUserToken(username!);
        const bookings = await callArray<BookingLike>(
          "GET",
          "/api/bookings/my",
          { token },
        );
        const { status: ownStatus, data: ownedData } = await call<
          OwnedSpotLike[]
        >("GET", "/api/owners/me/spots", { token });
        const owned =
          ownStatus === 200 && Array.isArray(ownedData) ? ownedData : [];
        // Attach the building name to each active reservation so the user knows
        // where the spot is (bookings/my doesn't carry the lot name).
        const active = bookings.filter((b) => b.status === "active");
        let enriched = bookings;
        if (active.length > 0) {
          const [spots, lots] = await Promise.all([
            callArray<SpotLike>("GET", "/api/spots"),
            lotNameMap(),
          ]);
          const lotBySpotLabel = new Map<string, string | undefined>(
            spots.map((s) => [
              (s.label ?? `#${s.number}`).toLowerCase(),
              s.lot_id ? lots.get(s.lot_id) : undefined,
            ]),
          );
          enriched = bookings.map((b) => ({
            ...b,
            building: lotBySpotLabel.get(
              (b.spot_label ?? `#${b.spot_number}`).toLowerCase(),
            ),
          }));
        }
        reply(formatStatus(enriched, owned));
        return;
      }

      default:
        reply(`🤔 I didn’t catch that. Here’s what I can do:\n${HELP_TEXT}`);
        return;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
