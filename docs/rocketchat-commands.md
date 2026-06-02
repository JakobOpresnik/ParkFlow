# ParkFlow Rocket.Chat Bot — Command Spec (Draft for discussion)

Status: webhook **connected and verified**. Real payload confirmed; identity field is
`user_name` (e.g. `jsernec`) which equals the Authentik username = ParkFlow identity.

This is a working draft of what the chatbot should understand. Nothing here is final —
it's the basis for discussion. Open questions are marked **❓**.

---

## 1. Interaction model

- The bot lives in a DM / dedicated channel. The outgoing webhook fires on **every
  message** (the captured payload had `text: "hej"` with no prefix), so users type
  commands **directly**: `help`, `reserve A12`, `status`, …
- **No `!park` prefix needed.** The first word is the command; the rest are arguments.
- Reads (free spots, status) need no auth. Writes (reserve / cancel) act **as the
  sender** (`user_name`), enforced by the existing booking rules — no rule is duplicated.

## 2. Behaviour rules

- `help` / `info` → return the list of commands.
- **Unknown / empty / unrecognised message** (e.g. `hej`) → return the **same help
  message**, phrased in a friendly way ("I didn't catch that — here's what I can do:").
- Replies should be short, conversational, and human-friendly (not raw JSON / error codes).

---

## 3. Proposed commands (v1)

Legend — Auth: 🔓 none · 👤 acts as sender.

All commands are **plain text** (no `/` — native slash commands need a Rocket.Chat App;
the webhook delivers ordinary messages, which is what we use). Replies are in **English**.

| Command (phrase) | What it does | Maps to | Auth |
|---|---|---|---|
| `help` / `info` / `?` | List available commands | — | 🔓 |
| `status` / `me` | **Your** parking situation: your active reservation; if you're an **owner**, the state of your spot(s) incl. shared-spot logic (who's using it today) | `GET /api/bookings/my` + `GET /api/owners/me/spots` (+ presence) | 👤 |
| `free spots` / `spots` / `available` `[building]` | List free (unoccupied) spots — all, or one **building** | `GET /api/spots` (+ `?lot_id=`) | 🔓 |
| `reserve <spot\|building\|any> [today\|tomorrow\|dd.mm.yyyy]` | Reserve a spot **if you can** (empty-only + all rules); date optional, default **today**. Held for the **working day 09:00–17:00** (Slovenian time). `building`/`any` → a random free spot. | `POST /api/bookings` | 👤 |
| `cancel reservation` / `cancel [<spot>]` | Cancel **your reservation**, if you have one | `PATCH /api/bookings/:id/cancel` | 👤 |
| `free spot` / `free my spot` / `release` `[today\|tomorrow\|dd.mm.yyyy]` | Free **your owned** parking spot (owner) for the day, if you can | `PUT /api/owners/me/spots/:id/day-status` `{status:'free'}` | 👤 |
| `history` | Your last **5** bookings | `GET /api/bookings/my` | 👤 |

### ⚠️ Command grammar — `free` is disambiguated by the next word

- `free spots` (plural) / `spots` / `available` → **list** free spots
- `free spot` (singular) / `free my spot` / `release` → **release your owned spot**
- `cancel reservation` / `cancel` → **cancel your reservation**

So "reservations are *cancelled*, owned spots are *freed*". The parser keys on the
`free spots` vs `free spot` vs `cancel …` phrase. (Singular/plural is a thin distinction —
the extra aliases above make intent unambiguous.)

### Building names + aliases (from the DB)

The three lots are hard-coded in the DB. The bot resolves a building alias → lot via
`GET /api/lots`:

| Lot name (DB) | Accepted aliases in chat |
|---|---|
| `Zunanje parkirišče` | `outside`, `out`, `zunaj`, `zunanje` |
| `Klet -1` | `-1`, `k-1`, `klet-1`, `klet1`, `basement1`, `b1` |
| `Klet -2` | `-2`, `k-2`, `klet-2`, `klet2`, `basement2`, `b2` |

Example: `free spots zunaj` → free spots in *Zunanje parkirišče* only.

### Notes on the trickier ones

- **`status`** — this is *user-centric*, not per-spot. It should answer "what's my parking
  situation right now?":
  - If you have an active reservation → "You have A12 reserved until 17:00."
  - If you're an **owner** of a spot and it's yours today → "Your spot A12 is free for you
    today / is taken by you."
  - **Shared (multi-owner) spot** → depends on who's present today (timesheet presence
    logic — see `project_owner_parking_logic`): "A12 is shared with X; today it's
    available to you because X is away" / "today X is using it."

- **`spots` / building filter** — there are **three lots/buildings**. The bot should be
  able to list free spots for all of them, or for one building. ❓ How does the user name
  a building in chat? (e.g. `spots outside`, `spots P1`, `spots zunaj`)

- **`reserve` / `cancel`** — already implemented and enforce the real rules. `reserve` only
  succeeds on an empty/bookable spot; `cancel` only works on your own (or owner-permitted)
  booking.

- **Reservation window — fixed working hours.** Every reservation (today *and* future dates)
  holds the spot for the **working day 09:00–17:00** in Slovenian local time (`starts_at`
  09:00, `expires_at` 17:00), with a DST-aware conversion to UTC (`ljubljanaInstant`). There
  is no "now + 8 h" default any more — a spot grabbed at 00:11 no longer expired at 08:11.
  Reserving for **today after 17:00** is refused with a clear message (see §7 B) instead of
  creating a reservation that would expire the moment it's made.

---

## 4. My additional suggestions

| Command | Why it's useful |
|---|---|
| `spot <name>` | Status of **one specific** spot ("is A12 free?") — complements the user-centric `status` |
| `whoami` | Debug/identity sanity check — echoes the username the bot sees (great while testing) |
| `buildings` / `lots` | List the three lots with their names, so users know what to type for the filter |
| `suggest` / `nearest` | Smart recommendation: "best free spot for you right now" (later — reuses the suggestion scoring idea) |
| `subscribe <spot>` / `notify` | Ping me when a spot frees up — **needs an incoming webhook** (push into chat), bigger scope |

---

## 5. Decisions

✅ **Resolved**
1. `free` disambiguated → `free spots` = list, `free spot`/`release` = free owned spot,
   `cancel reservation`/`cancel` = cancel reservation (see grammar above).
2. Building aliases defined (Zunanje parkirišče / Klet -1 / Klet -2 → see alias table).
3. `history` → last **5** bookings, from `GET /api/bookings/my`.
4. `reserve` accepts a date: default **today**, or `today`/`tomorrow`/`dd.mm.yyyy`. Every
   reservation runs the **working day 09:00–17:00** (Slovenian time); same-day after 17:00 is
   refused.
5. Language → commands + replies in **English**.

6. **Spot naming** → users type the spot **label** (e.g. `A12`); chat labels match DB labels.
7. **`free spot` (release owned)** → endpoint **exists**: `PUT /api/owners/me/spots/:id/day-status`
   with `{date, status:'free'}` (verifies ownership, same as the UI "Free my spot" button).
   Will be implemented.
8. **Owner `status` wording** → my call (drafted below).

### Draft owner `status` replies (point 8)

- No reservation, not an owner → "You have no active reservation."
- Active reservation → "You have **A12** reserved for **today** (until 17:00)."
- You own a spot, free for you today → "You own **A12** — it's yours today."
- You freed your spot today → "You freed **A12** for today, so it's open to others."
- Shared/multi-owner spot, available to you → "**A12** (shared with **Maja**) is yours today — Maja is away."
- Shared spot, in use by a co-owner → "**A12** is shared; today **Maja** is using it."

---

## 6. Implementation status

**All commands in this spec are implemented and tested** in
`backend/src/routes/integrations.ts` (`backend/src/__tests__/integrations.routes.test.ts`):
`help`/`info`, user-centric `status`/`me`, `free spots`/`spots` with building filter,
`reserve <spot> [date]`, `cancel [<spot>]`, `free spot`/`release [date]`, `history` (last 5),
plus the error-handling taxonomy in §7 (unknown → help, bad args → targeted hint, rules →
explained). Pure parser/date/alias/formatter functions are unit-tested; loopback wiring is
covered by route-level e2e tests.

---

## 7. Error handling & edge cases

The **command keyword must be at the start** of the message (case-insensitive). Based on
that first word, three outcomes:

### A. First word is NOT a known command → friendly help
Any message that doesn't start with a known keyword (`hej`, `kako si`, random text) →
return a friendly line + the full help list. The help list is rendered with emojis +
Rocket.Chat markdown (`*bold*`, `` `code` ``, `_italic_`):
> 🤔 I didn't catch that. Here's what I can do:
> 🅿️ *ParkFlow* — your parking assistant. Here's what I can do:
> 📊 *status* — your current reservation and your owned spot
> 🟢 *free spots* `[building]` — see what's open right now
> 🚗 *reserve* `<spot|building|any> [today|tomorrow|dd.mm.yyyy]` — holds a spot 09:00–17:00
> ❌ *cancel* `[spot]` · 🔓 *free spot* `[date]` · 🕔 *history* · 🗺️ *map* `[spot]` · ❓ *help*
> 💡 _Dates accept_ `today`, `tomorrow` _or_ `dd.mm.yyyy`.

### B. Known command, but the argument is missing/invalid → **specific** message (NOT generic help)
The whole point: a wrong spot or date gets a precise, helpful reply.

| Situation | Reply |
|---|---|
| `reserve` (no spot) | "Which spot? e.g. `reserve A12` (optionally `reserve A12 tomorrow`)." |
| `reserve X22` (spot doesn't exist) | "I couldn't find spot **X22**. Type `free spots` to see what's available." |
| `reserve A12 32.13.2026` (bad date) | "I didn't understand the date **32.13.2026**. Use `today`, `tomorrow`, or `dd.mm.yyyy`." |
| `reserve A12` (today, but already past 17:00) | "No working time left today — reservations run 09:00–17:00. Try `reserve … tomorrow`." |
| `cancel` (no active reservation) | "You have no active reservation to cancel." |
| `cancel A12` (you have none on A12) | "You don't have a reservation on **A12**." |
| `free spot` (you don't own one) | "You don't own a parking spot, so there's nothing to free." |
| `free spot A12` (not your spot) | "**A12** isn't your spot, so you can't free it." |

### C. Known command, valid input, but business rule rejects it → explain the rule
These come straight from the existing endpoints (no rule duplicated):

| Situation | Reply |
|---|---|
| `reserve A12` but it's taken | "**A12** isn't available for that day. Type `free spots` to see open ones." |
| `reserve A12` but you already booked today | "You already have a reservation for that day." |
| (any) backend/permission error | a plain-language version of the endpoint's error |

**Rule of thumb:** unknown command → help; known command with bad/missing args → targeted
hint; valid command rejected by rules → explain why. Never dump raw JSON or HTTP codes.

---

## 8. UX backlog (proposals)

Implemented:
- ✅ **Warn before replacing** — reserving when you already hold a spot that day no longer
  silently replaces it; the bot tells you to `cancel` first.
- ✅ Building name + expiry time on `reserve`/`status`; status icons in `history`;
  single-digit dates; greeting replies.
- ✅ **Map deep-links** — `reserve` confirmations include a link, and `map`/`where <spot>`
  returns a link to the public map with that spot highlighted
  (`<PUBLIC_FRONTEND_URL>/?spot=<id>`). Frontend reads `?spot=` → selects the lot and draws
  the highlight ring; the link survives the login redirect (sessionStorage).
- ✅ **Fixed working-hours window** — every reservation now runs **09:00–17:00** Slovenian
  time (today + future), DST-aware; the old "now + 8 h" default (which expired a 00:11 grab
  at 08:11) is gone. Same-day after 17:00 is refused with a helpful message.
- ✅ **Redesigned `help`/greeting** — emoji-led, grouped, with inline examples and a date
  tip, using Rocket.Chat markdown.

Proposed (pick what's worth it):
1. **Slovenian command aliases** — let users type `rezerviraj`, `prekliči`, `prosto` /
   `prosta mesta`, `zgodovina`, `sprosti`. Big win since users write in Slovene.
   (Open: replies stay English, or switch replies to Slovene too?)
2. **Flexible spot matching** — accept `z3`, `Z 3`, `z-3` all as `Z-3` (normalise: lowercase,
   strip spaces/hyphens) so users don't need the exact hyphenated label.
3. **Suggest a spot** — `reserve` with no spot → "Z-3 is free — try `reserve Z-3`."; when a
   spot is taken → suggest the nearest free one.
4. **Discoverable cancel** — append "Reply `cancel` to release." to a reservation confirmation.
5. **Friendlier today** — show "until 17:00 today" instead of the full date when the
   reservation is for today (expiry is now always 17:00).
6. **Did-you-mean** — on an unknown command, fuzzy-match the closest command before falling
   back to help.
7. **Cap long lists** — if many free spots, show first N + "filter by building".

Still to verify live: **owner `status` wording** (your spot / shared spot / presence) — needs
a user that is actually linked as an owner in the data.

---

## 8. Future addon — optional LLM intent parser

**Status: NOT implemented. Future enhancement.** v1 is deterministic keyword parsing
(`parseCommand`). This addon layers an LLM *behind* it for fuzzy / natural-language input,
without changing the architecture.

### Goal

Handle messages that don't match a keyword command (`is there anything free downstairs?`,
`daj mi mesto za jutri`, `reserve X22 please`) by translating natural language → the
**existing** command schema. The LLM **only parses intent** — it never decides business
rules. `bookings.ts` / `owners.ts` remain the single source of truth for availability,
presence, conflicts and ownership.

### Where it sits (hybrid — pay for the LLM only when needed)

```
RC message ──> integrations endpoint
   1. deterministic keyword parse  ──hit──>  switch + loopback   (instant, free, reliable)
   2. on `unknown` ──> LLM parse (structured) ──> {command, spot, building, date, confidence}
                                                       │
                                            same switch + same loopback
```

- A keyword hit (`reserve A12`) **bypasses the LLM entirely** — preserves latency, cost and
  100% reliability for the common case.
- Only the `unknown` branch (the natural hook point in the current `switch`) calls the model.

### Implementation shape

One **constrained tool-use / structured-output** call (not freeform chat) so we always get
valid JSON matching the existing `switch`:

```json
{
  "name": "parse_parking_command",
  "input_schema": {
    "type": "object",
    "properties": {
      "command":    { "enum": ["status","free_spots","reserve","cancel_reservation","free_spot","history","help","unknown"] },
      "spot":       { "type": ["string","null"] },
      "building":   { "enum": ["zunaj","klet-1","klet-2", null] },
      "date":       { "type": ["string","null"], "description": "ISO yyyy-mm-dd resolved from today/tomorrow/dd.mm.yyyy" },
      "confidence": { "type": "number" }
    },
    "required": ["command"]
  }
}
```

- `tool_choice` pinned to this tool → no prose to parse.
- `command:"unknown"` or low `confidence` → fall through to the existing help / "did you
  mean A12?" clarify path.
- Smallest/fastest model tier (Haiku-class). Tiny static system prompt (command list + date
  rules + **today's date**) → **prompt-cache** the static part.
- Map the returned object straight into the existing `switch` + loopback. **No new business
  logic.**

### Open considerations

- **Dedicated / self-hosted LLM:** if it exposes an OpenAI-/Anthropic-compatible endpoint,
  point the parse call at it — same pattern. Self-hosting avoids per-call cost and keeps PII
  in-infra (otherwise every fuzzy message leaves to an external API).
- **Needs constrained output:** use the model's tool-calling / JSON-grammar mode. If
  unsupported (older/local model), fall back to "respond with ONLY this JSON" + strict
  server-side `JSON.parse` with one retry — workable but less reliable.
- **Latency:** adds ~1–3 s before the loopback; must stay within the Rocket.Chat
  outgoing-webhook timeout. Keep the model fast and the prompt minimal; never put it in front
  of keyword hits.
- **Scope boundary:** this is a *parser*, not an agent. Multi-turn conversational booking
  ("something near the entrance tomorrow afternoon") would be a separate, larger step (a
  tool-using agent calling the same endpoints) — out of scope for this addon.
