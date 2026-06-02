import { Router } from "express";
import jwt from "jsonwebtoken";

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
  "*status* — your current reservation and your owned spot",
  "*free spots* `[building]` — see what's open right now",
  "      _building:_ `zunaj` · `klet1` · `klet2`",
  "*reserve* `<spot|building|any> [today|tomorrow|dd.mm.yyyy]`",
  `      Holds a spot for the working day (${WORK_HOURS_LABEL}). Give a building name or \`any\` to grab a random free one.`,
  "      _e.g._ `reserve A12` · `reserve zunaj tomorrow` · `reserve any`",
  "*cancel* `[spot]` — cancel your reservation",
  "*free spot* `[date]` — release your own spot for a day so a colleague can use it",
  "*history* — your last 5 bookings",
  "*map* `[spot]` / *where* `<spot>` — get a map link (highlighting the spot)",
  "*help* — show this list",
  "",
  "_Dates accept_ `today`, `tomorrow` _or_ `dd.mm.yyyy`.",
].join("\n");

// --- Command parsing (pure, unit-tested) -----------------------------------

export type Command =
  | "help"
  | "greet"
  | "status"
  | "spots"
  | "reserve"
  | "cancel"
  | "free-spot"
  | "history"
  | "map"
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

// The command keyword must be the first word. "free" is disambiguated by the
// next word: "free spots" → list, "free spot"/"free my spot" → release owned.
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
    case "release":
      return { command: "free-spot", rest: after(1) };
    case "cancel": {
      const rest = after(1);
      if (rest[0]?.toLowerCase() === "reservation") rest.shift();
      return { command: "cancel", rest };
    }
    case "free": {
      const w1 = tokens[1]?.toLowerCase();
      if (w1 === "spots") return { command: "spots", rest: after(2) };
      if (w1 === "spot") return { command: "free-spot", rest: after(2) };
      if (w1 === "my") {
        // "free my spot ..." — drop "my" and an optional "spot"
        const rest = after(2);
        if (rest[0]?.toLowerCase() === "spot") rest.shift();
        return { command: "free-spot", rest };
      }
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

export function formatFreeSpots(spots: SpotLike[]): string {
  const free = spots.filter((s) => s.status === "free");
  if (free.length === 0) return "No free spots right now.";
  return `Free spots (${free.length}): ${free.map(spotLabel).join(", ")}`;
}

// Group free spots by building, ordered by the given lots order.
export function formatFreeSpotsByBuilding(
  spots: SpotLike[],
  lots: Lot[],
): string {
  const free = spots.filter((s) => s.status === "free");
  if (free.length === 0) return "No free spots right now.";

  const lines: string[] = [];
  const grouped = new Set<SpotLike>();
  for (const lot of lots) {
    const inLot = free.filter((s) => s.lot_id === lot.id);
    inLot.forEach((s) => grouped.add(s));
    if (inLot.length > 0) {
      lines.push(
        `• ${lot.name} (${inLot.length}): ${inLot.map(spotLabel).join(", ")}`,
      );
    }
  }
  const other = free.filter((s) => !grouped.has(s));
  if (other.length > 0) {
    lines.push(`• Other (${other.length}): ${other.map(spotLabel).join(", ")}`);
  }
  return `Free spots (${free.length}):\n${lines.join("\n")}`;
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

export function formatFreeSpotResult(
  status: number,
  label: string,
  date: string,
): string {
  if (status === 200)
    return `Freed ${label} for ${date} — it’s now open to others.`;
  if (status === 403) return `${label} isn’t your spot, so you can’t free it.`;
  if (status === 404)
    return "You don’t own a parking spot, so there’s nothing to free.";
  return `Could not free ${label}.`;
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
        reply(`📍 ${spot.label ?? `#${spot.number}`}: ${spotLink(spot.id)}`);
        return;
      }

      case "spots": {
        const buildingToken = rest[0];
        if (buildingToken) {
          const lot = resolveLot(
            buildingToken,
            await callArray<Lot>("GET", "/api/lots"),
          );
          if (!lot) {
            reply(
              `I don’t know the building "${buildingToken}". Try: zunaj, klet1, klet2.`,
            );
            return;
          }
          const spots = await callArray<SpotLike>(
            "GET",
            `/api/spots?lot_id=${lot.id}`,
          );
          reply(`${lot.name} — ${formatFreeSpots(spots)}`);
          return;
        }
        // No building filter — list all free spots grouped by building.
        const spots = await callArray<SpotLike>("GET", "/api/spots");
        const lots = await callArray<Lot>("GET", "/api/lots");
        reply(formatFreeSpotsByBuilding(spots, lots));
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
        // Deep-link to the reserved day (omit for today to keep the URL clean).
        const linkDate = date === localDate(now) ? undefined : date;
        reply(
          status === 201
            ? `${reserveMsg}\n📍 See it on the map: ${spotLink(spot.id, linkDate)}`
            : reserveMsg,
        );
        return;
      }

      case "cancel": {
        if (!needUser()) return;
        const token = mintUserToken(username!);
        const spotName = rest[0];
        const bookings = await callArray<BookingLike>(
          "GET",
          "/api/bookings/my",
          { token },
        );
        const active = bookings.filter((b) => b.status === "active");
        let target: BookingLike | undefined;
        if (spotName) {
          target = active.find(
            (b) =>
              b.spot_label?.toLowerCase() === spotName.toLowerCase() ||
              String(b.spot_number) === spotName,
          );
        } else if (active.length === 1) {
          target = active[0];
        } else if (active.length > 1) {
          reply(
            `You have ${active.length} reservations. Say e.g. "cancel ${bookingLabel(active[0]!)}".`,
          );
          return;
        }
        if (!target?.id) {
          reply(
            spotName
              ? `You don’t have a reservation on ${spotName}.`
              : "You have no active reservation to cancel.",
          );
          return;
        }
        const { status } = await call(
          "PATCH",
          `/api/bookings/${target.id}/cancel`,
          { token },
        );
        reply(formatCancelResult(status, bookingLabel(target)));
        return;
      }

      case "free-spot": {
        if (!needUser()) return;
        const token = mintUserToken(username!);
        // Disambiguate "free spot <name>" vs "free spot <date>".
        let spotName: string | undefined;
        let dateArg: string | undefined;
        if (rest[0] && parseDate(rest[0], now) !== null) {
          dateArg = rest[0];
        } else {
          spotName = rest[0];
          dateArg = rest[1];
        }
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
        const { status: ownStatus, data: ownedData } = await call<
          OwnedSpotLike[]
        >("GET", "/api/owners/me/spots", { token });
        const owned = Array.isArray(ownedData) ? ownedData : [];
        if (ownStatus === 404 || owned.length === 0) {
          reply("You don’t own a parking spot, so there’s nothing to free.");
          return;
        }
        let spot: OwnedSpotLike | undefined;
        if (spotName) {
          const wanted = spotName;
          spot = owned.find((s) => matchesLabel(s, wanted));
          if (!spot) {
            reply(`${spotName} isn’t your spot, so you can’t free it.`);
            return;
          }
        } else if (owned.length === 1) {
          spot = owned[0]!;
        } else {
          reply(
            `You own ${owned.length} spots. Say e.g. "free spot ${spotLabel(owned[0]!)}".`,
          );
          return;
        }
        const { status } = await call(
          "PUT",
          `/api/owners/me/spots/${spot.id}/day-status`,
          { token, body: { date, status: "free" } },
        );
        reply(formatFreeSpotResult(status, spotLabel(spot), date));
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
