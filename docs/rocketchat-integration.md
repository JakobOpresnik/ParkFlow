# ParkFlow ⇄ Rocket.Chat Integration

Brief for the Rocket.Chat administrator/developer.

## Goal

Let users query and manage parking from Rocket.Chat:
- **Read** (no auth): list free spots, check if a spot is free.
- **Write** (authenticated as the user): reserve / cancel a spot, list own reservations.

All parking business rules live in the ParkFlow backend. Rocket.Chat only needs **one
Outgoing Webhook** — no custom app, no scripting. ParkFlow does the rest.

## What the Rocket.Chat side configures

Admin → **Integrations → New Integration → Outgoing WebHook**:

| Field | Value |
| --- | --- |
| Event Trigger | `Message Sent` |
| Enabled | `True` |
| Channel | a dedicated bot channel / DM (every message there is treated as a command) |
| Trigger Words | _leave empty_ — fire on every message; commands are plain words (`status`, `reserve A12`, `help`, …), no prefix |
| URLs | `https://parkflow.matheo.si/api/integrations/rocketchat` |
| Post as | a bot user, e.g. `parkflow-bot` |
| Token | a shared secret (see "Values to exchange" below) |
| Script Enabled | `False` (default payload is sufficient) |

That's all. No code to write on the Rocket.Chat side.

## Values to exchange (3 things)

1. **Backend URL** — the public endpoint is
   `POST https://parkflow.matheo.si/api/integrations/rocketchat` (the frontend nginx
   proxies `/api/` to the backend). Rocket.Chat must be able to reach it.
2. **Shared token** — agree on a secret string. The RC admin puts it in the
   integration's *Token* field; ParkFlow stores the same value in
   `ROCKETCHAT_WEBHOOK_TOKEN`. ParkFlow rejects any request whose token doesn't match.
3. **Username = SSO username** — confirmed: Rocket.Chat `user_name` equals the
   Authentik SSO username (`preferred_username`), which ParkFlow uses to identify the
   user. No extra ID mapping needed.

## Request contract (what Rocket.Chat sends)

Standard Rocket.Chat outgoing-webhook JSON POST. ParkFlow reads these fields:

```json
{
  "token": "<shared token>",
  "user_name": "jan.sernec",
  "channel_name": "parking",
  "text": "!park reserve A12"
}
```

## Response contract (what ParkFlow returns)

ParkFlow replies with JSON that Rocket.Chat posts back into the channel:

```json
{ "text": "Reserved spot A12 until 17:00." }
```

On errors it returns the same shape with a human-readable message
(e.g. `{ "text": "Spot A12 is not available right now." }`).

## Commands (English, plain words — no prefix)

Users type plain words in the bot channel. Full, current spec lives in
`docs/rocketchat-commands.md`. Summary:

| User types | Action | Auth |
| --- | --- | --- |
| `help` / `info` | list commands (also shown for anything unrecognised) | none |
| `free spots [building]` | list free spots, grouped by building | none |
| `status` | your reservation + owned-spot situation | as the user |
| `reserve <spot\|building\|any> [today\|tomorrow\|dd.mm.yyyy]` | reserve a spot | as the user |
| `cancel [<spot>]` | cancel your reservation | as the user |
| `free spot [date]` | free your owned spot for a day | as the user |
| `history` | your last 5 bookings | as the user |
| `map`/`where <spot>` | link to the map with the spot highlighted | none |

## Security notes

- ParkFlow verifies the shared `token` on every request, so only your Rocket.Chat
  instance can trigger actions.
- A user can only send messages **as themselves**; `user_name` cannot be spoofed by
  another user. Writes therefore act as the authenticated sender.
- Reads expose no personal data (the public spot list is already PII-scrubbed).

## ParkFlow side (implemented)

`POST /api/integrations/rocketchat` (`backend/src/routes/integrations.ts`) verifies the
token, parses the command, mints a backend JWT for the user
(`userId = username = displayName = user_name`, `role: 'user'`), and calls the existing
endpoints via localhost loopback — no booking logic is duplicated. Config:
`ROCKETCHAT_WEBHOOK_TOKEN` (shared secret) and `PUBLIC_FRONTEND_URL`
(`https://parkflow.matheo.si`, for map deep-links) — both set in `compose.yml`.
