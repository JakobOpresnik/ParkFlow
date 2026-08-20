<div align="center">

# 💬 ParkFlow ⇄ Rocket.Chat Integration

**One outgoing webhook, no custom app.**
Brief for the Rocket.Chat administrator/developer — what to configure, what to exchange, and what ParkFlow does with it.

![Rocket.Chat](https://img.shields.io/badge/Rocket.Chat-outgoing_webhook-F5455C?style=flat-square&logo=rocketdotchat&logoColor=white)
![Express](https://img.shields.io/badge/endpoint-Express_5-000000?style=flat-square&logo=express&logoColor=white)
![Auth](https://img.shields.io/badge/auth-shared_token-yellow?style=flat-square)

</div>

---

## 📑 Contents

- [🎯 Goal](#-goal)
- [⚙️ What Rocket.Chat Configures](#️-what-rocketchat-configures)
- [🔑 Values to Exchange](#-values-to-exchange)
- [📡 Request & Response Contract](#-request--response-contract)
- [🚀 Commands](#-commands)
- [🔒 Security Notes](#-security-notes)
- [🅿️ ParkFlow Side](#️-parkflow-side)

---

## 🎯 Goal

Let users query and manage parking from Rocket.Chat:

| Kind | Auth | Examples |
| --- | --- | --- |
| 📖 **Read** | none | list free spots, check if a spot is free |
| ✍️ **Write** | as the sending user | reserve / cancel a spot, list own reservations |

All parking business rules live in the ParkFlow backend. Rocket.Chat needs **one Outgoing Webhook** — no custom app, no scripting. ParkFlow does the rest.

---

## ⚙️ What Rocket.Chat Configures

Admin → **Integrations → New Integration → Outgoing WebHook**:

| Field | Value |
| --- | --- |
| Event Trigger | `Message Sent` |
| Enabled | `True` |
| Channel | a dedicated bot channel / DM (every message there is treated as a command) |
| Trigger Words | _leave empty_ — fire on every message; commands are plain words (`status`, `reserve A12`, `help`, …), no prefix |
| URLs | `https://parkflow.matheo.si/api/integrations/rocketchat` |
| Post as | a bot user, e.g. `parkflow-bot` |
| Token | a shared secret (see [🔑 Values to Exchange](#-values-to-exchange)) |
| Script Enabled | `False` (the default payload is sufficient) |

That's all. No code to write on the Rocket.Chat side.

---

## 🔑 Values to Exchange

### 1️⃣ Backend URL

`POST https://parkflow.matheo.si/api/integrations/rocketchat` — the frontend nginx proxies `/api/` to the backend. Rocket.Chat must be able to reach it.

### 2️⃣ Shared token

Agree on a secret string. The RC admin puts it in the integration's *Token* field; ParkFlow stores the same value in `ROCKETCHAT_WEBHOOK_TOKEN`.

> [!IMPORTANT]
> ParkFlow rejects any request whose token doesn't match. A mismatch means every command silently fails.

### 3️⃣ Username = SSO username

Confirmed: Rocket.Chat `user_name` equals the Authentik SSO username (`preferred_username`), which ParkFlow uses to identify the user. No extra ID mapping needed.

---

## 📡 Request & Response Contract

**What Rocket.Chat sends** — standard outgoing-webhook JSON POST. ParkFlow reads these fields:

```json
{
  "token": "<shared token>",
  "user_name": "jsernec",
  "channel_name": "parking",
  "text": "reserve A12"
}
```

**What ParkFlow returns** — JSON that Rocket.Chat posts back into the channel:

```json
{ "text": "Reserved spot A12 until 17:00." }
```

On errors it returns the same shape with a human-readable message, e.g. `{ "text": "Spot A12 is not available right now." }`.

---

## 🚀 Commands

Users type plain words in the bot channel — English, no prefix. The full, current spec lives in [`rocketchat-commands.md`](rocketchat-commands.md). Summary:

| User types | Action | Auth |
| --- | --- | --- |
| `help` / `info` | list commands (also shown for anything unrecognised) | none |
| `free spots [building]` | list free spots, grouped by building | none |
| `status` | your reservation + owned-spot situation | as the user |
| `reserve <spot\|building\|any> [today\|tomorrow\|dd.mm.yyyy]` | reserve a spot | as the user |
| `cancel [<spot>]` | cancel your reservation | as the user |
| `history` | your last 5 bookings | as the user |
| `owners [building] [date]` | list ACEX employees and their assigned spots (grouped by owner), each tagged 🟩 free / 🟥 taken / 🟪 unconfirmed (shared, 2+ co-owners may be in) for the chosen day (defaults to today); optional building filter (`zunaj`/`klet1`/`klet2`) restricts to one building | none |
| `stats [building] [date]` | live occupancy snapshot — overall % full + per-building breakdown (defaults to today) | none |
| `peak hours [building]` | busiest parking times from the last ~90 days (peak day/hour) | none |
| `map` / `where <spot>` | link to the map with the spot highlighted | none |

---

## 🔒 Security Notes

- ParkFlow verifies the shared `token` on every request, so only your Rocket.Chat instance can trigger actions.
- A user can only send messages **as themselves**; `user_name` cannot be spoofed by another user. Writes therefore act as the authenticated sender.
- Most reads expose no personal data — the public spot list shown by `free spots` carries no contact details.

> [!CAUTION]
> The `owners` command intentionally lists employee names against their assigned spots, and it needs no auth like the other reads. Anyone in the bot channel can see the owner roster. Restrict the channel's membership accordingly, or drop `owners` if that exposure isn't acceptable.

---

## 🅿️ ParkFlow Side

Implemented in `backend/src/routes/integrations.ts`. `POST /api/integrations/rocketchat`:

1. Verifies the token.
2. Parses the command.
3. Mints a backend JWT for the user (`userId = username = displayName = user_name`, `role: 'user'`).
4. Calls the existing endpoints via localhost loopback — **no booking logic is duplicated**.

| Config | Purpose |
| --- | --- |
| `ROCKETCHAT_WEBHOOK_TOKEN` | Shared secret |
| `PUBLIC_FRONTEND_URL` | `https://parkflow.matheo.si`, for map deep-links |

Both are set in `compose.yml`.

---

<div align="center">

[Project README](../README.md) · [Command spec](rocketchat-commands.md)

</div>
