<div align="center">

# 🤖 ParkFlow Rocket.Chat Bot — Command Spec

**Everything the chatbot understands, and how it answers.**
Plain-word commands in a DM or bot channel — no prefix, no slash commands, no custom Rocket.Chat app.

![Status](https://img.shields.io/badge/webhook-connected_&_verified-brightgreen?style=flat-square)
![Commands](https://img.shields.io/badge/v1_commands-implemented_&_tested-blue?style=flat-square)
![Language](https://img.shields.io/badge/replies-English-lightgrey?style=flat-square)

</div>

> [!NOTE]
> Webhook status: **connected and verified.** Real payload confirmed; the identity field is `user_name` (e.g. `jsernec`), which equals the Authentik username = ParkFlow identity.
>
> This started as a working draft for discussion. Open questions are still marked **❓**.

---

## 📑 Contents

- [⚡ Interaction Model](#-interaction-model)
- [🗣️ Behaviour Rules](#️-behaviour-rules)
- [🚀 Commands (v1)](#-commands-v1)
- [🏢 Building Names + Aliases](#-building-names--aliases)
- [🔔 Reminders](#-reminders)
- [💡 Additional Suggestions](#-additional-suggestions)
- [✅ Decisions](#-decisions)
- [📦 Implementation Status](#-implementation-status)
- [🐛 Error Handling & Edge Cases](#-error-handling--edge-cases)
- [📋 UX Backlog](#-ux-backlog)
- [🧠 Future Addon — LLM Intent Parser](#-future-addon--llm-intent-parser)

---

## ⚡ Interaction Model

- The bot lives in a DM / dedicated channel. The outgoing webhook fires on **every message** (the captured payload had `text: "hej"` with no prefix), so users type commands **directly**: `help`, `reserve A12`, `status`, …
- **No `!park` prefix needed.** The first word is the command; the rest are arguments.
- Reads (free spots, status) need no auth. Writes (reserve / cancel) act **as the sender** (`user_name`), enforced by the existing booking rules — no rule is duplicated.

---

## 🗣️ Behaviour Rules

| Input | Response |
| --- | --- |
| `help` / `info` | The list of commands |
| Unknown / empty / unrecognised (e.g. `hej`) | The **same** help message, phrased friendly — "I didn't catch that — here's what I can do:" |

Replies are short, conversational, and human-friendly — never raw JSON or error codes.

---

## 🚀 Commands (v1)

Legend — Auth: 🔓 none · 👤 acts as sender.

All commands are **plain text** (no `/` — native slash commands need a Rocket.Chat App; the webhook delivers ordinary messages, which is what we use). Replies are in **English**.

<details open>
<summary><strong>📋 Command table</strong></summary>

| Command (phrase) | What it does | Maps to | Auth |
|---|---|---|---|
| `help` / `info` / `?` | List available commands | — | 🔓 |
| `status` / `me` | **Your** parking situation: your active reservation; if you're an **owner**, the state of your spot(s) incl. shared-spot logic (who's using it today) | `GET /api/bookings/my` + `GET /api/owners/me/spots` (+ presence) | 👤 |
| `free spots` / `spots` / `available` `[building] [today\|tomorrow\|dd.mm.yyyy]` | List spots that are **really free** for a day — all, or one **building**; **defaults to today**. Building and date tokens are order-independent. "Free" means effective availability (active booking → per-day override → ACEX pool → owner presence → stored status), the same rule the map and `owners` use — not just live status. When presence (timesheet) can't be reached, owner spots fall back to stored status and a "list may be incomplete" note is appended. | `GET /api/spots` (+ `?lot_id=`) + `/api/lots` + `/api/spots/day-overrides` + `/api/presence` | 🔓 |
| `reserve <spot\|building\|any> [today\|tomorrow\|dd.mm.yyyy]` | Reserve a spot **if you can** (empty-only + all rules); date optional, default **today**. Held for the **working day 09:00–17:00** (Slovenian time). `building`/`any` → a random free spot. | `POST /api/bookings` | 👤 |
| `cancel reservation` / `cancel [<spot>]` | Cancel **your reservation**, if you have one | `PATCH /api/bookings/:id/cancel` | 👤 |
| `history` | Your last **5** bookings | `GET /api/bookings/my` | 👤 |
| `owners [building] [today\|tomorrow\|dd.mm.yyyy]` | List **ACEX-employee** parking spots grouped by owner, each label tagged with an availability icon for the chosen day: 🟩 free for others / 🟥 taken (a co-owner is in, or it's reserved/overridden) / 🟪 **unconfirmed** — shared spot where 2+ co-owners may be in office, so the bot can't tell who's using it (mirrors the app's *Unconfirmed* state). Optional **building filter** (`zunaj`/`klet1`/`klet2`, same aliases as `free spots`) restricts the list to owners with a spot in that building and names it in the header. Building and date may be given in **any order**; **date defaults to today**. Skips unowned spots, the ACEX public pool, placeholders/vehicles and external rentals (filtered by `NOT_ACEX_OWNERS`) | `GET /api/spots` + `/api/lots` + `/api/spots/day-overrides` + `/api/presence` | 🔓 |
| `stats` `[building] [today\|tomorrow\|dd.mm.yyyy]` | Live occupancy snapshot: overall **% full** + free/total, plus a per-building breakdown (or a single figure when scoped to a building). Presence-aware (same effective status as `owners`). Building/date in **any order**; **date defaults to today**. Single keyword — `stats` only | `GET /api/spots` + `/api/lots` + `/api/spots/day-overrides` + `/api/presence` | 🔓 |
| `peak hours` `[building]` | Busiest parking times from the historical occupancy heatmap (~last 90 days): peak day×hour bucket, busiest weekday, busiest hour. Optional building filter. Single trigger phrase — only `peak hours` (not `peak`/`busy` alone) | `GET /api/stats/history` (+ `?lot_id=`) | 🔓 |

</details>

> [!NOTE]
> Releasing an **owned** spot for a day (per-day override) is done in the web app (*My parking*), not via chat — the bot has no command for it.

### ⚠️ Command grammar

| Phrase | Meaning |
| --- | --- |
| `free spots` / `free spot` / `spots` / `available` | **list** free spots |
| `cancel reservation` / `cancel` | **cancel your reservation** |

### 🔍 Notes on the trickier ones

<details>
<summary><strong>📊 <code>status</code> — user-centric, not per-spot</strong></summary>

It should answer "what's my parking situation right now?":

- Active reservation → "You have A12 reserved until 17:00."
- **Owner** of a spot, and it's yours today → "Your spot A12 is free for you today / is taken by you."
- **Shared (multi-owner) spot** → depends on who's present today (timesheet presence logic — see `project_owner_parking_logic`): "A12 is shared with X; today it's available to you because X is away" / "today X is using it."

</details>

<details>
<summary><strong>🏢 <code>spots</code> / building filter</strong></summary>

There are **three lots/buildings**. The bot should be able to list free spots for all of them, or for one building.

**❓** How does the user name a building in chat? (e.g. `spots outside`, `spots P1`, `spots zunaj`)

</details>

<details>
<summary><strong>🚗 <code>reserve</code> / <code>cancel</code></strong></summary>

Already implemented and enforce the real rules. `reserve` only succeeds on an empty/bookable spot; `cancel` only works on your own (or owner-permitted) booking.

</details>

<details>
<summary><strong>🕔 Reservation window — fixed working hours</strong></summary>

Every reservation (today *and* future dates) holds the spot for the **working day 09:00–17:00** in Slovenian local time (`starts_at` 09:00, `expires_at` 17:00), with a DST-aware conversion to UTC (`ljubljanaInstant`).

There is no "now + 8 h" default any more — a spot grabbed at 00:11 no longer expired at 08:11. Reserving for **today after 17:00** is refused with a clear message (see [§ Error Handling B](#b-known-command-but-the-argument-is-missinginvalid--specific-message)) instead of creating a reservation that would expire the moment it's made.

</details>

---

## 🏢 Building Names + Aliases

The three lots are hard-coded in the DB. The bot resolves a building alias → lot via `GET /api/lots`:

| Lot name (DB) | Accepted aliases in chat |
|---|---|
| `Zunanje parkirišče` | `outside`, `out`, `zunaj`, `zunanje` |
| `Klet -1` | `-1`, `k-1`, `klet-1`, `klet1`, `basement1`, `b1` |
| `Klet -2` | `-2`, `k-2`, `klet-2`, `klet2`, `basement2`, `b2` |

```text
free spots zunaj          → free spots in Zunanje parkirišče only
free spots klet1 tomorrow → spots free in Klet -1 tomorrow
                            (≡ free spots tomorrow klet1)
```

---

## 🔔 Reminders

ParkFlow can DM you a morning heads-up ("you have a reservation today"). These are **on by default**.

| Command | What it does |
| --- | --- |
| `reminders` | List each reminder type and whether it's on (🔔) or off (🔕) |
| `reminders off <type\|all>` | Turn a reminder off (e.g. `reminders off reservation_today`, or `reminders off all`) |
| `reminders on <type\|all>` | Turn it back on |

> [!TIP]
> The same toggles live in the app under **Profile → Preferences**.

---

## 💡 Additional Suggestions

| Command | Why it's useful |
|---|---|
| `spot <name>` | Status of **one specific** spot ("is A12 free?") — complements the user-centric `status` |
| `whoami` | Debug/identity sanity check — echoes the username the bot sees (great while testing) |
| `buildings` / `lots` | List the three lots with their names, so users know what to type for the filter |
| `suggest` / `nearest` | Smart recommendation: "best free spot for you right now" (later — reuses the suggestion scoring idea) |
| `subscribe <spot>` / `notify` | Ping me when a spot frees up — **needs an incoming webhook** (push into chat), bigger scope |

---

## ✅ Decisions

**Resolved:**

1. `free` disambiguated → `free spots` = list, `free spot`/`release` = free owned spot, `cancel reservation`/`cancel` = cancel reservation (see grammar above).
2. Building aliases defined (Zunanje parkirišče / Klet -1 / Klet -2 → see alias table).
3. `history` → last **5** bookings, from `GET /api/bookings/my`.
4. `reserve` accepts a date: default **today**, or `today`/`tomorrow`/`dd.mm.yyyy`. Every reservation runs the **working day 09:00–17:00** (Slovenian time); same-day after 17:00 is refused.
5. Language → commands + replies in **English**.
6. **Spot naming** → users type the spot **label** (e.g. `A12`); chat labels match DB labels.
7. **`free spot` (release owned)** → endpoint **exists**: `PUT /api/owners/me/spots/:id/day-status` with `{date, status:'free'}` (verifies ownership, same as the UI "Free my spot" button). Will be implemented.
8. **Owner `status` wording** → my call (drafted below).

### Draft owner `status` replies (point 8)

| Situation | Reply |
| --- | --- |
| No reservation, not an owner | "You have no active reservation." |
| Active reservation | "You have **A12** reserved for **today** (until 17:00)." |
| You own a spot, free for you today | "You own **A12** — it's yours today." |
| You freed your spot today | "You freed **A12** for today, so it's open to others." |
| Shared/multi-owner spot, available to you | "**A12** (shared with **Maja**) is yours today — Maja is away." |
| Shared spot, in use by a co-owner | "**A12** is shared; today **Maja** is using it." |

---

## 📦 Implementation Status

**All commands in this spec are implemented and tested** in `backend/src/routes/integrations.ts` (`backend/src/__tests__/integrations.routes.test.ts`):

- `help`/`info`
- user-centric `status`/`me`
- `free spots`/`spots` with building **and date** filter (order-independent, default today, presence-aware)
- `reserve <spot> [date]`, `cancel [<spot>]`, `history` (last 5)
- `owners [building] [date]` — who owns which spot, with per-day 🟩/🟥/🟪 availability and an optional building filter (a public read)
- `stats [building] [date]` — live occupancy snapshot
- `peak hours [building]` — busiest times from the history heatmap
- the error-handling taxonomy below (unknown → help, bad args → targeted hint, rules → explained)

Pure parser/date/alias/formatter functions are unit-tested; loopback wiring is covered by route-level e2e tests.

---

## 🐛 Error Handling & Edge Cases

The **command keyword must be at the start** of the message (case-insensitive). Based on that first word, three outcomes:

### A. First word is NOT a known command → friendly help

Any message that doesn't start with a known keyword (`hej`, `kako si`, random text) returns a friendly line plus the full help list, rendered with emojis + Rocket.Chat markdown (`*bold*`, `` `code` ``, `_italic_`):

> 🤔 I didn't catch that. Here's what I can do:
> 🅿️ *ParkFlow* — your parking assistant. Here's what I can do:
> 📊 *status* — your current reservation and your owned spot
> 🟢 *free spots* `[building] [today|tomorrow|dd.mm.yyyy]` — what's free (default today)
> 🚗 *reserve* `<spot|building|any> [today|tomorrow|dd.mm.yyyy]` — holds a spot 09:00–17:00
> ❌ *cancel* `[spot]` · 🔓 *free spot* `[date]` · 🕔 *history* · 🗺️ *map* `[spot]` · ❓ *help*
> 💡 _Dates accept_ `today`, `tomorrow` _or_ `dd.mm.yyyy`.

### B. Known command, but the argument is missing/invalid → **specific** message

Not generic help — that's the whole point. A wrong spot or date gets a precise, helpful reply.

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

### C. Known command, valid input, but a business rule rejects it → explain the rule

These come straight from the existing endpoints — no rule is duplicated:

| Situation | Reply |
|---|---|
| `reserve A12` but it's taken | "**A12** isn't available for that day. Type `free spots` to see open ones." |
| `reserve A12` but you already booked today | "You already have a reservation for that day." |
| (any) backend/permission error | a plain-language version of the endpoint's error |

> [!IMPORTANT]
> **Rule of thumb:** unknown command → help; known command with bad/missing args → targeted hint; valid command rejected by rules → explain why. Never dump raw JSON or HTTP codes.

---

## 📋 UX Backlog

<details open>
<summary><strong>✅ Implemented</strong></summary>

- **Warn before replacing** — reserving when you already hold a spot that day no longer silently replaces it; the bot tells you to `cancel` first.
- Building name + expiry time on `reserve`/`status`; status icons in `history`; single-digit dates; greeting replies.
- **Map deep-links** — `reserve` confirmations include a link, and `map`/`where <spot>` returns a link to the public map with that spot highlighted (`<PUBLIC_FRONTEND_URL>/?spot=<id>`). The frontend reads `?spot=` → selects the lot and draws the highlight ring; the link survives the login redirect (sessionStorage).
- **Fixed working-hours window** — every reservation now runs **09:00–17:00** Slovenian time (today + future), DST-aware; the old "now + 8 h" default (which expired a 00:11 grab at 08:11) is gone. Same-day after 17:00 is refused with a helpful message.
- **Redesigned `help`/greeting** — emoji-led, grouped, with inline examples and a date tip, using Rocket.Chat markdown.

</details>

<details>
<summary><strong>🔮 Proposed — pick what's worth it</strong></summary>

| # | Idea | Detail |
|---|---|---|
| 1 | **Slovenian command aliases** | Let users type `rezerviraj`, `prekliči`, `prosto` / `prosta mesta`, `zgodovina`, `sprosti`. Big win since users write in Slovene. (Open: replies stay English, or switch replies to Slovene too?) |
| 2 | **Flexible spot matching** | Accept `z3`, `Z 3`, `z-3` all as `Z-3` (normalise: lowercase, strip spaces/hyphens) so users don't need the exact hyphenated label |
| 3 | **Suggest a spot** | `reserve` with no spot → "Z-3 is free — try `reserve Z-3`."; when a spot is taken → suggest the nearest free one |
| 4 | **Discoverable cancel** | Append "Reply `cancel` to release." to a reservation confirmation |
| 5 | **Friendlier today** | Show "until 17:00 today" instead of the full date when the reservation is for today (expiry is now always 17:00) |
| 6 | **Did-you-mean** | On an unknown command, fuzzy-match the closest command before falling back to help |
| 7 | **Cap long lists** | If many free spots, show first N + "filter by building" |

</details>

> [!WARNING]
> Still to verify live: **owner `status` wording** (your spot / shared spot / presence) — needs a user that is actually linked as an owner in the data.

---

## 🧠 Future Addon — LLM Intent Parser

> [!NOTE]
> **Status: NOT implemented. Future enhancement.** v1 is deterministic keyword parsing (`parseCommand`). This addon layers an LLM *behind* it for fuzzy / natural-language input, without changing the architecture.

### 🎯 Goal

Handle messages that don't match a keyword command (`is there anything free downstairs?`, `daj mi mesto za jutri`, `reserve X22 please`) by translating natural language → the **existing** command schema.

The LLM **only parses intent** — it never decides business rules. `bookings.ts` / `owners.ts` remain the single source of truth for availability, presence, conflicts and ownership.

### 🔀 Where it sits — hybrid, pay for the LLM only when needed

```text
RC message ──> integrations endpoint
   1. deterministic keyword parse  ──hit──>  switch + loopback   (instant, free, reliable)
   2. on `unknown` ──> LLM parse (structured) ──> {command, spot, building, date, confidence}
                                                       │
                                            same switch + same loopback
```

- A keyword hit (`reserve A12`) **bypasses the LLM entirely** — preserving latency, cost and 100% reliability for the common case.
- Only the `unknown` branch (the natural hook point in the current `switch`) calls the model.

### 🔧 Implementation shape

One **constrained tool-use / structured-output** call (not freeform chat) so we always get valid JSON matching the existing `switch`:

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
- `command:"unknown"` or low `confidence` → fall through to the existing help / "did you mean A12?" clarify path.
- Smallest/fastest model tier (Haiku-class). Tiny static system prompt (command list + date rules + **today's date**) → **prompt-cache** the static part.
- Map the returned object straight into the existing `switch` + loopback. **No new business logic.**

### 🤔 Open considerations

| Concern | Detail |
| --- | --- |
| 🏠 **Dedicated / self-hosted LLM** | If it exposes an OpenAI-/Anthropic-compatible endpoint, point the parse call at it — same pattern. Self-hosting avoids per-call cost and keeps PII in-infra (otherwise every fuzzy message leaves to an external API). |
| 📐 **Needs constrained output** | Use the model's tool-calling / JSON-grammar mode. If unsupported (older/local model), fall back to "respond with ONLY this JSON" + strict server-side `JSON.parse` with one retry — workable but less reliable. |
| ⏱️ **Latency** | Adds ~1–3 s before the loopback; must stay within the Rocket.Chat outgoing-webhook timeout. Keep the model fast and the prompt minimal; never put it in front of keyword hits. |
| 🚧 **Scope boundary** | This is a *parser*, not an agent. Multi-turn conversational booking ("something near the entrance tomorrow afternoon") would be a separate, larger step (a tool-using agent calling the same endpoints) — out of scope for this addon. |

---

<div align="center">

[Project README](../README.md) · [Rocket.Chat setup brief](rocketchat-integration.md)

</div>
