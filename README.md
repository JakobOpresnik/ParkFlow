<div align="center">

# 🅿️ ParkFlow

**🚗 Smart parking management for multi-lot facilities.**
Real-time spot tracking, presence-aware booking, and administration.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-runtime-000000?style=flat-square&logo=bun&logoColor=white)

</div>

ParkFlow is a full-stack web application built for internal parking management at facilities with multiple parking lots or floors. It solves a common workplace problem: reserved spots sitting empty when their owners are working remotely or on leave, while other employees have nowhere to park.

**The core value proposition:** ParkFlow integrates with the AI uprava timesheet system to know who is in the office each day. When a spot's owner is absent, their reserved spot is automatically shown as available — no manual intervention required. Employees can book it for the day directly from an interactive map, and the spot returns to its reserved state the following day.

Beyond presence-aware availability, ParkFlow provides:
- A visual SVG parking map drawn over real CAD floor plans, with zoom, pan, and pinch-to-zoom
- A self-service booking system with automatic expiry
- An owner portal where spot owners free up or hold their spot for a day, week, month, or until they revert it
- A full admin panel for managing lots, spots, and owners
- A complete audit log of every change
- Real-time updates via Server-Sent Events
- In-app notifications plus scheduled Rocket.Chat reminders
- A feedback/feature request system for users
- English and Slovenian localization, with read-only guest browsing

---

## 📑 Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [🐳 Docker (Recommended)](#-docker-recommended)
  - [🔧 Manual Setup](#-manual-setup)
- [🔑 Environment Variables](#-environment-variables)
- [📡 API Reference](#-api-reference)
- [🗄️ Database Schema](#️-database-schema)
- [🐘 Production DB — Read-Only Access](#-production-db--read-only-access)
- [🧪 Testing](#-testing)
- [✅ Code Quality](#-code-quality)
- [🗺️ Roadmap](#️-roadmap)
- [🎨 Interface Design System](#-interface-design-system)
- [🤝 Contributing](#-contributing)

---

## ✨ Features

### 🏢 Parking Management

- 🗂️ **Multi-lot support** — manage multiple parking locations (floors, zones, areas) independently, each with its own floor plan image
- 🔴🟢 **Real-time spot status** — each spot reflects its live state: `free`, `occupied`, `reserved`, or `spotted`
- 👀 **"Spotted" reports** — any user can flag a free-looking spot as actually taken; it shows as `spotted` until the report expires or someone books it
- 🚗 **Spot types** — `standard`, `ev` (EV charging), `handicap`, `compact` — filterable in the UI
- 🗺️ **SVG map overlay** — interactive parking map drawn over real CAD floor plans with zoom, pan, and pinch-to-zoom
- ✏️ **Visual map editor** — admin tool to draw and reposition spot coordinates directly on the floor plan image, persisted to the database
- 📅 **Per-day overrides** — admins and spot owners can manually mark a spot as free or occupied for a specific date, overriding the default status

### 📅 Booking System

- 🖱️ Users can book free spots directly from the map or spot grid
- ⏱️ Bookings auto-expire after 8 hours (configurable start/end times)
- 🔄 Creating a new booking auto-cancels the user's existing active booking for the same day
- 📜 Full booking history with status tracking (`active`, `cancelled`, `expired`)
- 🔒 **Owner protection** — spot owners who book their own spot cannot have their booking cancelled by other admins
- 🚫 **Conflict prevention** — booking is blocked if the spot already has an active booking on the target date
- ⏳ **Past days are read-only** — day pickers only offer today and future workdays, and the app always opens on the current date

### 🗓️ Timesheet Integration

- 🔗 **Presence-aware availability** — spot availability is automatically adjusted based on employee presence data fetched from the AI uprava timesheet API (`GET /api/v1/timesheet/entries?from=&to=`, static bearer token, company network only)
- 🗓️ **Week navigation** — users can browse the current or any future Mon–Fri week with prev/next controls; the current workday is auto-selected on load and past days are disabled
- 🏠 If a spot's owner is absent (remote, sick, on leave, etc.), their reserved spot is shown as **free** for that day without modifying the database
- 📅 Presence data is fetched for the full week and cached; the frontend merges it with spot data client-side via `useEffectiveSpots`
- 🔄 **Polled once a minute** (`lib/presencePoll.ts`) — the timesheet API is REST-only, so an SSE `spot_change` is pushed to clients whenever parking availability actually changes. The Action Cable client in `lib/timesheetWs.ts` is kept **dormant** for when a push channel appears; set `TIMESHEET_WS_URL` and call `startTimesheetWs()` to revive it
- 🪪 **Owner sync** (`lib/ownerSync.ts`) — **the timesheet is the source of truth.** Each poll writes the employee's `user_id`, work email and `parking_spot` onto their `owners` row, and re-points `spots.owner_id` to match: if AI uprava says `1VP55` is Bernard Sovdat's, it is his everywhere in the app. Reassignments are audited in `spot_changes` as `owner_assigned` by `timesheet`, exactly like an admin change, and trigger an SSE `spot_change`
- 🔒 Identity is resolved by stored id, work email or name — **never** by the parking spot. Spot-first matching wrote one employee's email onto another person's row wherever ParkFlow and the timesheet disagreed. Owner rows that aren't people (pool, placeholders, rentals) are never linked, employees with no owner row are reported rather than created, and spot labels unknown to ParkFlow are reported too
- ✅ **Presence-aware booking** — a spot whose owner is absent can be booked directly even if its DB status is `occupied`
- 🌍 Work-free days (public holidays) are detected automatically from the timesheet and all spots are treated as available

### 👤 Owner Portal

- 🔑 Spot owners can log in and see their own spots and weekly booking overview
- 📅 Owners can free up or hold their spot for a **day, week, month, or indefinitely** (until they revert it) — an indefinite override is a single `date IS NULL` row
- 🗺️ The same controls are available straight from the spot modal on the map, not just the `/my-parking` page
- 🚧 A spot the owner has marked unavailable shows as **unavailable** to everyone else, so nobody tries to book it
- 📋 Owners can view who has booked their spot each day of the week

### 🔧 Administration

- 🛡️ **Admin panel** with full CRUD for parking lots, spots, and owners
- 🚧 **Take spots out of circulation** — admins can toggle a spot between available and occupied to remove an ACEX shared-pool spot from the bookable pool (forcing `reserved` is deliberately not possible — reservations always belong to a person)
- 🙅 **Owner-controlled spots are off-limits** — `PATCH /api/spots/:id/status` returns `403` for any spot with a real owner; its availability comes from presence plus the owner's own overrides
- 🏷️ **Named status badges** — the admin spots list shows today's effective status and names who holds each spot (the booker, the admin who forced it, or the presence-confirmed occupant); a reserved spot with no nameable holder displays as `unavailable`, with a matching status filter
- 👤 **Owner management** — create owners with name, email, phone, vehicle plate, and notes; link to SSO username for self-service login
- 📋 **Audit log** — every spot status change is recorded with who changed it, when, and the before/after values (change types: `owner_assigned`, `owner_unassigned`, `status_changed`, `type_changed`); the actor is an admin's display name, `timesheet` for owner syncs, or `system` for legacy rows
- 💬 **Feedback management** — view, triage, and update status of user-submitted feature requests and bug reports

### 🔔 Real-Time Updates

- 📡 **Server-Sent Events (SSE)** — clients subscribe to `/api/subscribe` for live spot status updates; no polling required
- 🔄 All spot status changes are broadcast to connected clients instantly

### 🔔 Notifications & Reminders

- 🛎️ **In-app notifications** — a notification bell surfaces booking and spot events, with mark-as-read and mark-all-read
- ⏰ **Scheduled reminders** — a `reminders-cron` service nudges users with a weekday-morning "you have a spot reserved today" and a Friday-afternoon "free your spot if you won't need it" to spot owners
- 💬 **Rocket.Chat integration** — reminders and release notices are delivered as Rocket.Chat DMs, and an inbound webhook bot answers parking queries from chat
- ⚙️ **Per-user opt-out** — users can disable any reminder type from their profile

### 🌍 Localization

- 🇬🇧 🇸🇮 Full **English and Slovenian** translations via `i18next` / `react-i18next`
- 🔀 In-app language switcher; user-facing strings, relative times, and dates are all localized

### 🔐 Authentication & Access Control

- 🔑 **Authentik SSO** — OAuth 2.0 with PKCE flow; no username/password stored locally
- 🪪 Bearer tokens validated server-side against the Authentik userinfo endpoint on each request
- 👑 **Admin role** — granted to members of the configured Authentik group (`AUTHENTIK_ADMIN_GROUP`)
- 👤 **Guest mode** — `POST /api/auth/guest` mints a short-lived read-only token so visitors can browse the map without an SSO account; all write actions are blocked for guests
- 🚫 All endpoints require authentication; write operations additionally reject guests, and admin operations require the admin role

### 📊 Dashboard & Analytics

- 📈 **Dashboard** — occupancy overview, weekly usage bar chart, live activity feed naming who made each change
- 📉 **Analytics / Stats page** — per-floor breakdown, utilization metrics, stacked progress bars
- 🔥 **Peak-hours heatmap** — historical occupancy by weekday/hour, derived from booking and override history (`GET /api/stats/history`)
- 👤 **Profile page** — user preferences, attendance stats, active booking summary

### 💬 Feedback System

- Users can submit feature requests and bug reports from within the app
- Categories: `general`, `bug`, `feature`, `improvement`
- Admins can triage submissions with statuses: `open`, `in_progress`, `done`, `dismissed`

### 🎨 UI/UX

- 🌙 Dark mode toggle
- 📱 Mobile-first responsive design
- 🪟 Spot detail modal with inline booking, owner info, and status management
- ⬆️ Floating scroll-to-top button on every long page (admin tables, owners, bookings, dashboard)

---

## 🛠️ Tech Stack

### 🖥️ Frontend (`/frontend`)

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| ⚛️ Framework       | React 19 + TypeScript 5.9                               |
| ⚡ Build           | Vite 7                                                  |
| 🎨 UI              | Mantine 8 + Tailwind CSS 4 (local `components/ui` primitives) |
| 🌍 i18n            | i18next + react-i18next (English / Slovenian)           |
| 🗃️ State           | Zustand 5                                               |
| 🔄 Data Fetching   | TanStack Query 5                                        |
| 🧭 Routing         | TanStack Router 1.162                                   |
| 🖼️ Icons           | Lucide React                                            |
| 🧪 Testing         | Vitest 4 + Testing Library (jsdom)                      |
| 📦 Package Manager | Bun                                                     |

### ⚙️ Backend (`/backend`)

| Layer              | Technology                        |
| ------------------ | --------------------------------- |
| 🚂 Framework       | Express 5                         |
| 🐘 Database        | PostgreSQL 16                     |
| 🔒 Auth            | Authentik SSO (OAuth 2.0 / PKCE)  |
| 🔌 DB Client       | node-postgres (pg 8)              |
| 🧪 Testing         | Vitest 4 + Supertest 7            |
| 📦 Package Manager | Bun                               |

---

## 📁 Project Structure

```text
parkflow/
├── 🖥️  frontend/                   # React SPA
│   ├── src/
│   │   ├── api/                # Typed API client wrappers
│   │   ├── components/         # Shared UI components
│   │   │   ├── ParkingMap/     # SVG canvas with zoom/pan
│   │   │   ├── SpotGrid/       # Responsive spot card grid
│   │   │   ├── SpotModal/      # Spot detail + booking modal
│   │   │   └── ui/             # Local UI primitives (Mantine + Tailwind wrappers)
│   │   ├── hooks/              # React Query hooks (useSpots, useBookings, useEffectiveSpots, …)
│   │   ├── i18n/               # i18next config + en/sl locale files
│   │   ├── lib/                # Shared helpers (datetime, spots, utils)
│   │   ├── pages/              # Route-level page components
│   │   ├── store/              # Zustand state (auth, UI, lot selection)
│   │   └── types/              # Shared TypeScript interfaces
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── ⚙️  backend/                    # Express REST API
│   ├── src/
│   │   ├── routes/             # Route handlers (spots, owners, lots, bookings, auth, changes, presence, stats, feedback, notifications, subscribe, integrations, internal)
│   │   ├── lib/                # Presence client, reminder scheduler, Rocket.Chat notify, SSE helpers
│   │   ├── middleware/         # Auth, error handler
│   │   ├── db/                 # pg connection pool
│   │   └── __tests__/          # Vitest + Supertest test suites
│   ├── migrations/             # Ordered SQL migration files (auto-run on startup)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── 📖  docs/                       # Architecture notes, Rocket.Chat setup, prod DB read-only access
├── 🎨  jakob/                      # UI prototype (Mantine 8 + mock data, reference only)
├── 🎞️  presentation/               # Slides / demo material
├── 🐳  compose.yml                 # Production deployment (used by GitLab CI/CD)
├── 🐳  docker-compose.yml          # Production build (local)
├── 🐳  docker-compose.dev.yml      # Local development with hot reload
└── 📖  CLAUDE.md                   # Monorepo guidelines for AI-assisted development
```

---

## 🚀 Getting Started

### Prerequisites

- 🐳 [Docker](https://docs.docker.com/get-docker/) and Docker Compose

  or

- 🍞 [Bun](https://bun.sh/) + PostgreSQL 16 for manual setup

### 🐳 Docker (Recommended)

**Development** (with hot reload):

```bash
docker compose -f docker-compose.dev.yml up
```

| 🌐 Service     | URL                   |
| -------------- | --------------------- |
| 🖥️ Frontend    | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:3001 |
| 🐘 PostgreSQL  | localhost:5432        |

**Production build (local):**

```bash
docker compose up --build
```

**Production deployment (CI/CD):**

Deployment to production is handled by the GitLab CI/CD pipeline on every git tag push. The pipeline lints and tests both apps, builds Docker images, pushes them to the registry, and — after a manual approval click on the deploy job in the GitLab UI — deploys via `compose.yml` using SSH. The production stack also runs a `reminders-cron` service that triggers the scheduled reminder endpoints. Required CI/CD variables (set in GitLab project settings):

`POSTGRES_PASSWORD`, `JWT_SECRET`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `TIMESHEET_API_TOKEN`, `ROCKETCHAT_WEBHOOK_TOKEN`, `ROCKETCHAT_INCOMING_WEBHOOK_URL`, `REMINDER_TRIGGER_TOKEN`

Database migrations run automatically on first startup.

> [!IMPORTANT]
> Login is handled via Authentik SSO. Configure the OAuth environment variables before starting (see [🔑 Environment Variables](#-environment-variables)).

---

### 🔧 Manual Setup

**1️⃣ Clone and configure environment variables**

```bash
git clone <repo-url>
cd parkflow
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files — see [🔑 Environment Variables](#-environment-variables).

**2️⃣ Start PostgreSQL**

Ensure a PostgreSQL 16 instance is running and accessible via the `DATABASE_URL` in `backend/.env`.

**3️⃣ Run the backend**

```bash
cd backend
bun install
bun dev        # starts on port 3001, runs migrations automatically
```

**4️⃣ Run the frontend**

```bash
cd frontend
bun install
bun dev        # starts on port 5173
```

---

## 🔑 Environment Variables

### ⚙️ Backend (`backend/.env`)

| Variable                 | Description                                             | Example                                                  |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`           | 🐘 PostgreSQL connection string                         | `postgresql://user:password@localhost:5432/parkflow`     |
| `PORT`                   | 🔌 API server port                                      | `3001`                                                   |
| `JWT_SECRET`             | 🔑 Secret used to sign session tokens                   | `your-random-secret`                                     |
| `OAUTH_CLIENT_ID`        | 🪪 Authentik OAuth application client ID                | `your-client-id`                                         |
| `OAUTH_CLIENT_SECRET`    | 🔒 Authentik OAuth application client secret            | `your-client-secret`                                     |
| `OAUTH_TOKEN_URL`        | 🔗 Authentik token endpoint                             | `https://sso.example.com/application/o/token/`           |
| `AUTHENTIK_USERINFO_URL` | 🔗 Authentik userinfo endpoint for token validation     | `https://sso.example.com/application/o/userinfo/`        |
| `AUTHENTIK_ADMIN_GROUP`  | 👥 Authentik group name that grants admin role          | `parkflow-admins`                                        |
| `TIMESHEET_API_URL`      | 🗓️ AI uprava timesheet API base URL                     | `https://ai-uprava.matheo.si/api/v1/timesheet`           |
| `TIMESHEET_API_TOKEN`    | 🔒 Static bearer token for the timesheet API            | `your-timesheet-token`                                   |
| `PRESENCE_POLL_MS`       | 🔄 Presence poll interval in ms (`0` disables polling)   | `60000`                                                  |
| `TIMESHEET_WS_URL`       | 🔌 Timesheet WebSocket URL — unset (no push channel yet) | _(empty)_                                                |
| `ROCKETCHAT_WEBHOOK_TOKEN` | 💬 Shared secret expected from the Rocket.Chat outgoing webhook | `your-webhook-token`                          |
| `ROCKETCHAT_INCOMING_WEBHOOK_URL` | 🔗 Rocket.Chat incoming webhook URL for outbound DMs | `https://chat.example.com/hooks/...`              |
| `REMINDER_TRIGGER_TOKEN` | 🔑 Shared secret (`X-Reminder-Token`) gating the internal reminder endpoints | `your-reminder-token`               |
| `REMINDER_TZ`            | 🕒 Timezone for scheduled reminders                     | `Europe/Ljubljana`                                       |
| `REMINDER_MORNING_TIME`  | ☀️ Local time of the morning "you have a spot" reminder  | `07:30`                                                  |
| `REMINDER_OWNER_TIME`    | 🌇 Local time of the Friday "free your spot" owner nudge | `15:00`                                                  |
| `PUBLIC_FRONTEND_URL`    | 🌐 Frontend base URL used to build the bot's map deep-links | `https://parkflow.matheo.si`                          |
| `INTERNAL_API_BASE_URL`  | 🔁 Optional loopback base for the webhook's internal calls | `http://127.0.0.1:3001`                                |

### 🖥️ Frontend (`frontend/.env`)

| Variable                  | Description                              | Example                                           |
| ------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `VITE_API_URL`            | ⚙️ Backend base URL                      | `http://localhost:3001`                           |
| `VITE_OAUTH_AUTHORITY`    | 🔗 Authentik OAuth authority URL         | `https://sso.example.com/application/o/park-flow` |
| `VITE_OAUTH_CLIENT_ID`    | 🪪 OAuth client ID                       | `your-client-id`                                  |
| `VITE_OAUTH_REDIRECT_URI` | 🔄 OAuth redirect URI                    | `http://localhost:5173/callback`                  |
| `VITE_OAUTH_ADMIN_GROUP`  | 👥 Admin group name (must match backend) | `parkflow-admins`                                 |

---

## 📡 API Reference

**Base URL:** `http://localhost:3001`

All endpoints require an `Authorization: Bearer <token>` header (a guest token works for read-only browsing). Write endpoints additionally reject guests; admin-only endpoints require the `admin` role. Service-to-service endpoints (see [🔌 Integrations & Internal](#-integrations--internal)) use shared-secret headers instead of a JWT.

### 🔐 Auth

| Method | Endpoint              | Description                                         | Auth    |
| ------ | --------------------- | --------------------------------------------------- | ------- |
| `POST` | `/api/auth/exchange`  | Exchange OAuth code for JWT; returns `{token, id_token}` | —  |
| `POST` | `/api/auth/guest`     | Mint a short-lived read-only guest JWT `{token, id_token: null}` | — |
| `GET`  | `/api/auth/me`        | Get current user info `{id, username, displayName, role}` | 🔑 User |

### 🅿️ Spots

| Method   | Endpoint                              | Description                                              | Auth     |
| -------- | ------------------------------------- | -------------------------------------------------------- | -------- |
| `GET`    | `/api/spots?lot_id=`                  | List all spots (optionally filter by lot); includes owner + active booking | 🔑 User |
| `GET`    | `/api/spots/:number`                  | Get single spot by number; includes owner + active booking | 🔑 User |
| `GET`    | `/api/spots/:id/bookings?limit=`      | Booking history for a spot (default 50, max 200)         | 🔑 User  |
| `GET`    | `/api/spots/day-overrides?date=`      | Per-day status overrides for a date (`YYYY-MM-DD`)       | 🔑 User  |
| `POST`   | `/api/spots/:id/spotted`              | Report a free spot as actually taken (shows as `spotted` until expiry); `412` if not currently free | 🔑 User |
| `POST`   | `/api/spots`                          | Create a spot `{number, lot_id, label?, status?, type?}` | 🛡️ Admin |
| `PUT`    | `/api/spots/:id`                      | Update spot `{number?, label?, lot_id?, status?, type?}` | 🛡️ Admin |
| `DELETE` | `/api/spots/:id`                      | Delete a spot                                            | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/owner`                | Assign/unassign owner `{owner_id: string\|null}`         | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/status`               | Change status `{status: free\|occupied}`; `403` on owner-controlled spots | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/type`                 | Change type `{type: standard\|ev\|handicap\|compact}`    | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/coordinates`          | Save/clear SVG map coordinates `{coordinates: {...}\|null}` | 🛡️ Admin |

### 👤 Owners

| Method   | Endpoint                              | Description                                                        | Auth     |
| -------- | ------------------------------------- | ------------------------------------------------------------------ | -------- |
| `GET`    | `/api/owners`                         | List all owners (ordered by name)                                  | 🛡️ Admin |
| `POST`   | `/api/owners`                         | Create owner `{name, email?, phone?, vehicle_plate?, notes?, user_id?}` | 🛡️ Admin |
| `PUT`    | `/api/owners/:id`                     | Update owner details                                               | 🛡️ Admin |
| `DELETE` | `/api/owners/:id`                     | Delete owner (spot owner_id set to null via FK)                    | 🛡️ Admin |
| `PATCH`  | `/api/owners/:id/link`                | Link owner to SSO username `{username: string\|null}`              | 🛡️ Admin |
| `GET`    | `/api/owners/me`                      | Get own owner profile (matched via SSO username)                   | 🔑 User  |
| `GET`    | `/api/owners/me/spots`                | List own spots with active booking info                            | 🔑 User  |
| `GET`    | `/api/owners/me/week?from=&to=`       | Bookings on own spots for a date range (`YYYY-MM-DD`)              | 🔑 User  |
| `GET`    | `/api/owners/me/overrides?from=&to=`  | Per-day status overrides on own spots for a date range             | 🔑 User  |
| `PUT`    | `/api/owners/me/spots/:spotId/day-status` | Set/clear own override `{date?, status: free\|occupied\|null, days?: 1–31, indefinite?}` — `days` spans a week/month, `indefinite` drops the date | 🔑 User |

### 🏢 Parking Lots

| Method   | Endpoint        | Description                                                             | Auth     |
| -------- | --------------- | ----------------------------------------------------------------------- | -------- |
| `GET`    | `/api/lots`     | List all parking lots (ordered by `sort_order`, then name)              | 🔑 User  |
| `POST`   | `/api/lots`     | Create a lot `{name, description?, image_filename?, image_width?, image_height?, sort_order?}` | 🛡️ Admin |
| `PUT`    | `/api/lots/:id` | Update lot details                                                      | 🛡️ Admin |
| `DELETE` | `/api/lots/:id` | Delete a lot (only allowed if no spots remain)                          | 🛡️ Admin |

### 📅 Bookings

| Method  | Endpoint                      | Description                                                         | Auth    |
| ------- | ----------------------------- | ------------------------------------------------------------------- | ------- |
| `GET`   | `/api/bookings/my`            | Current user's bookings (active first, then history); triggers expiry check | 🔑 User |
| `POST`  | `/api/bookings`               | Book a spot `{spot_id, starts_at?, expires_at?}`; expires_at defaults to 8h from now; auto-cancels same-day booking | 🔑 User |
| `PATCH` | `/api/bookings/:id/times`     | Update booking times `{starts_at?, expires_at?}` (owner or admin only) | 🔑 User |
| `PATCH` | `/api/bookings/:id/cancel`    | Cancel a booking (self, admin, or spot owner — not if `booked_by_owner`) | 🔑 User |

### 🔔 Real-Time

| Method | Endpoint           | Description                                                         | Auth    |
| ------ | ------------------ | ------------------------------------------------------------------- | ------- |
| `GET`  | `/api/subscribe`   | SSE stream for live spot updates; pass token as `?token=` query param | 🔑 User |

### 🔔 Notifications

| Method  | Endpoint                          | Description                                                       | Auth    |
| ------- | --------------------------------- | ----------------------------------------------------------------- | ------- |
| `GET`   | `/api/notifications?undelivered=` | List the user's notifications (newest unread first, max 50)        | 🔑 User |
| `GET`   | `/api/notifications/prefs`        | Reminder catalog + the user's per-type on/off state               | 🔑 User |
| `PUT`   | `/api/notifications/prefs/:type`  | Toggle a reminder type `{enabled: boolean}`                       | 🔑 User |
| `PATCH` | `/api/notifications/read-all`     | Mark all of the user's notifications read                         | 🔑 User |
| `PATCH` | `/api/notifications/:id/read`     | Mark a single notification read                                   | 🔑 User |

### 📋 Audit & Feedback

| Method   | Endpoint                      | Description                                                  | Auth     |
| -------- | ----------------------------- | ------------------------------------------------------------ | -------- |
| `GET`    | `/api/changes?lot_id=`        | Last 50 spot changes with spot info and the acting user; owner ids are resolved to `new_owner_name`; optionally filter by lot | 🔑 User  |
| `POST`   | `/api/feedback`               | Submit feedback `{title, description, category?}`            | 🔑 User  |
| `GET`    | `/api/feedback`               | List all feedback submissions (newest first)                 | 🛡️ Admin |
| `PATCH`  | `/api/feedback/:id/status`    | Update feedback status `{status: open\|in_progress\|done\|dismissed\|archived}` | 🛡️ Admin |
| `DELETE` | `/api/feedback/:id`           | Delete a feedback entry                                      | 🛡️ Admin |

### 📊 Stats

| Method | Endpoint                                      | Description                                                                 | Auth    |
| ------ | --------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| `GET`  | `/api/stats/history?lot_id=&days=&heatmap_days=` | Historical occupancy: a daily series (default 30 days) + weekday/hour heatmap (default 90 days), derived from bookings and `occupied` day-overrides | 🔑 User |

### 🗓️ Presence (Timesheet)

| Method | Endpoint                      | Description                                                                           | Auth |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------- | ---- |
| `GET`  | `/api/presence?date=`         | Weekly presence from the AI uprava timesheet for the week containing `date` (`YYYY-MM-DD`); defaults to today; cached 30 min and refreshed by the poller. The timesheet's `email` / `parking_spot` are stripped for every caller; the per-day leave `status` for everyone but admins | 🔑 User |

### 🔌 Integrations & Internal

Service-to-service endpoints. These do **not** use a JWT — they are gated by shared-secret headers (or unauthenticated where noted).

| Method | Endpoint                              | Description                                                        | Auth                 |
| ------ | ------------------------------------- | ------------------------------------------------------------------ | -------------------- |
| `POST` | `/api/integrations/rocketchat`        | Rocket.Chat outgoing-webhook bot for parking queries               | 🔑 Webhook token     |
| `POST` | `/api/internal/reminders/run`         | Trigger the morning "you have a spot" reminder tick (`?dry=1` for dry run) | 🔑 `X-Reminder-Token` |
| `POST` | `/api/internal/reminders/owners/run`  | Trigger the Friday "free your spot" owner nudge (`?dry=1` for dry run)     | 🔑 `X-Reminder-Token` |
| `GET`  | `/api/owners/user-ids`                | SSO usernames of all spot owners (Friday reminder flow)            | —                    |

### ⚙️ Health

| Method | Endpoint   | Description   | Auth |
| ------ | ---------- | ------------- | ---- |
| `GET`  | `/health`  | Health check  | —    |

---

## 🗄️ Database Schema

Eleven PostgreSQL tables managed via ordered SQL migrations in `backend/migrations/`.

```bash
cd backend
bun run migrate   # apply manually if needed
```

> [!NOTE]
> Migrations run automatically at backend startup — the manual command is only for ad-hoc runs.

<details>
<summary><strong>👤 <code>owners</code></strong></summary>

Vehicle owners linked to reserved parking spots.

| Column          | Type          | Notes                                      |
| --------------- | ------------- | ------------------------------------------ |
| `id`            | UUID PK       | `gen_random_uuid()`                        |
| `name`          | TEXT NOT NULL | Display name (may contain `/` for co-owners) |
| `email`         | TEXT          | Work email, synced from the timesheet API   |
| `phone`         | TEXT          |                                            |
| `vehicle_plate` | TEXT          |                                            |
| `notes`         | TEXT          |                                            |
| `user_id`       | TEXT UNIQUE   | SSO username; enables owner self-service login |
| `timesheet_user_id` | INTEGER   | AI uprava employee id (unique where set), synced from the timesheet API |
| `parking_spot`  | TEXT          | Spot label the timesheet assigns this employee; `spots.owner_id` is re-pointed to match it on every sync |
| `created_at`    | TIMESTAMPTZ   | `now()`                                    |

</details>

<details>
<summary><strong>🅿️ <code>spots</code></strong></summary>

Individual parking spots with status, type, and optional SVG coordinates.

| Column        | Type          | Notes                                                              |
| ------------- | ------------- | ------------------------------------------------------------------ |
| `id`          | UUID PK       | `gen_random_uuid()`                                                |
| `number`      | INTEGER       | Unique per lot (composite unique with `lot_id`)                    |
| `label`       | TEXT          | Optional display label                                             |
| `floor`       | TEXT          | Default `'P1'`                                                     |
| `status`      | TEXT          | `free` \| `occupied` \| `reserved` — default `free`               |
| `type`        | TEXT          | `standard` \| `ev` \| `handicap` \| `compact` — default `standard` |
| `owner_id`    | UUID FK       | → `owners(id)` ON DELETE SET NULL                                  |
| `lot_id`      | UUID FK       | → `parking_lots(id)` ON DELETE SET NULL                            |
| `coordinates` | JSONB         | `{x, y, width, height, rotation, labelPosition, labelRotation}` for SVG overlay |
| `created_at`  | TIMESTAMPTZ   | `now()`                                                            |

</details>

<details>
<summary><strong>🏢 <code>parking_lots</code></strong></summary>

Multi-lot groupings — each lot has its own floor plan image.

| Column           | Type          | Notes                                     |
| ---------------- | ------------- | ----------------------------------------- |
| `id`             | UUID PK       | `gen_random_uuid()`                       |
| `name`           | TEXT NOT NULL |                                           |
| `description`    | TEXT          |                                           |
| `image_filename` | TEXT NOT NULL | Default `'parking-map.png'`               |
| `image_width`    | INTEGER       | Default `1200` — used for SVG scaling     |
| `image_height`   | INTEGER       | Default `700` — used for SVG scaling      |
| `sort_order`     | INTEGER       | Default `0` — controls display order      |
| `created_at`     | TIMESTAMPTZ   | `now()`                                   |

</details>

<details>
<summary><strong>🔑 <code>app_users</code></strong></summary>

Application users, synced from Authentik on first login.

| Column         | Type          | Notes                              |
| -------------- | ------------- | ---------------------------------- |
| `id`           | UUID PK       | `gen_random_uuid()`                |
| `username`     | TEXT UNIQUE   | SSO username                       |
| `display_name` | TEXT          |                                    |
| `role`         | TEXT          | `user` \| `admin` — default `user` |
| `created_at`   | TIMESTAMPTZ   | `now()`                            |

</details>

<details>
<summary><strong>📅 <code>bookings</code></strong></summary>

Parking reservations with automatic expiry.

| Column           | Type          | Notes                                                                |
| ---------------- | ------------- | -------------------------------------------------------------------- |
| `id`             | UUID PK       | `gen_random_uuid()`                                                  |
| `user_id`        | TEXT NOT NULL | SSO user identifier                                                  |
| `spot_id`        | UUID FK       | → `spots(id)` ON DELETE CASCADE                                      |
| `status`         | TEXT          | `active` \| `cancelled` \| `expired` — default `active`             |
| `booking_date`   | DATE          | Local (Europe/Ljubljana) calendar day; unique active booking per spot+day enforced via partial index |
| `reserved_by`    | TEXT          | Display name of the person who booked                                |
| `booked_at`      | TIMESTAMPTZ   | `now()`                                                              |
| `starts_at`      | TIMESTAMPTZ   | Optional booking start time                                          |
| `expires_at`     | TIMESTAMPTZ   | Auto-expiry time (default: 8h from booking)                          |
| `ended_at`       | TIMESTAMPTZ   | Set when cancelled or expired                                        |
| `cancelled_by`   | TEXT          | Display name of canceller; null if self-cancelled                    |
| `booked_by_owner`| BOOLEAN       | `true` if booked by the spot's owner — prevents co-owner cancellation |

</details>

<details>
<summary><strong>📋 <code>spot_changes</code></strong></summary>

Full audit log of every spot status/ownership change.

| Column        | Type          | Notes                                                                  |
| ------------- | ------------- | ---------------------------------------------------------------------- |
| `id`          | UUID PK       | `gen_random_uuid()`                                                    |
| `spot_id`     | UUID FK       | → `spots(id)` ON DELETE CASCADE                                        |
| `changed_by`  | TEXT          | Display name of the acting admin, `'timesheet'` for owner syncs, or `'system'` (legacy rows) |
| `change_type` | TEXT NOT NULL | `owner_assigned` \| `owner_unassigned` \| `status_changed` \| `type_changed` |
| `old_value`   | TEXT          |                                                                        |
| `new_value`   | TEXT          |                                                                        |
| `changed_at`  | TIMESTAMPTZ   | `now()` — indexed DESC                                                 |

</details>

<details>
<summary><strong>📆 <code>spot_day_status</code></strong></summary>

Per-day status overrides for individual spots (bypasses presence logic for that day).

| Column     | Type          | Notes                                       |
| ---------- | ------------- | ------------------------------------------- |
| `id`       | UUID PK       | `gen_random_uuid()`                         |
| `spot_id`  | UUID FK       | → `spots(id)` ON DELETE CASCADE             |
| `date`     | DATE          | Unique per spot (composite unique with `spot_id`); `NULL` = indefinite override, at most one per spot |
| `status`   | TEXT NOT NULL | `free` \| `occupied`                        |
| `set_by`   | TEXT          | Username who set the override               |
| `created_at` | TIMESTAMPTZ | `now()`                                     |

</details>

<details>
<summary><strong>💬 <code>feature_requests</code></strong></summary>

User-submitted feedback, bug reports, and feature requests.

| Column         | Type          | Notes                                                            |
| -------------- | ------------- | ---------------------------------------------------------------- |
| `id`           | UUID PK       | `gen_random_uuid()`                                              |
| `user_id`      | TEXT NOT NULL | SSO user identifier                                              |
| `display_name` | TEXT NOT NULL | Display name at time of submission                               |
| `title`        | TEXT NOT NULL |                                                                  |
| `description`  | TEXT NOT NULL |                                                                  |
| `category`     | TEXT          | `general` \| `bug` \| `feature` \| `improvement` — default `general` |
| `status`       | TEXT          | `open` \| `in_progress` \| `done` \| `dismissed` \| `archived` — default `open` |
| `created_at`   | TIMESTAMPTZ   | `now()`                                                          |

</details>

<details>
<summary><strong>👀 <code>spot_spotted_reports</code></strong></summary>

User-reported "this spot is actually taken" flags. A free spot with an active, non-expired report is displayed as `spotted` in the API.

| Column        | Type          | Notes                                                       |
| ------------- | ------------- | ----------------------------------------------------------- |
| `id`          | UUID PK       | `gen_random_uuid()`                                         |
| `spot_id`     | UUID FK       | → `spots(id)` ON DELETE CASCADE                             |
| `reported_by` | TEXT NOT NULL | Username who reported the spot                              |
| `reported_at` | TIMESTAMPTZ   | `now()`                                                     |
| `expires_at`  | TIMESTAMPTZ   | When the report lapses and the spot reverts                |
| `cleared_by`  | TEXT          | Username who cleared it (e.g. on booking)                  |
| `cleared_at`  | TIMESTAMPTZ   | Set when cleared; at most one active report per spot       |

</details>

<details>
<summary><strong>🔔 <code>notifications</code></strong></summary>

Durable per-user in-app notifications.

| Column       | Type          | Notes                                              |
| ------------ | ------------- | -------------------------------------------------- |
| `id`         | UUID PK       | `gen_random_uuid()`                                |
| `user_id`    | TEXT NOT NULL | SSO user identifier                                |
| `type`       | TEXT NOT NULL | Notification/reminder type                         |
| `title`      | TEXT NOT NULL |                                                    |
| `body`       | TEXT NOT NULL |                                                    |
| `data`       | JSONB         | Optional structured payload                        |
| `created_at` | TIMESTAMPTZ   | `now()`                                            |
| `read_at`    | TIMESTAMPTZ   | Set when the user reads it                         |
| `pushed_at`  | TIMESTAMPTZ   | Set when proactively delivered (e.g. via chat)     |

</details>

<details>
<summary><strong>⚙️ <code>notification_prefs</code></strong></summary>

Per-user opt-out for scheduled reminder types. Absence of a row means enabled (default-on).

| Column          | Type          | Notes                                       |
| --------------- | ------------- | ------------------------------------------- |
| `user_id`       | TEXT NOT NULL | SSO user identifier (PK with `reminder_type`) |
| `reminder_type` | TEXT NOT NULL | Reminder type key (PK with `user_id`)        |
| `enabled`       | BOOLEAN       | Default `true`                              |
| `updated_at`    | TIMESTAMPTZ   | `now()`                                     |

</details>

---

## 🐘 Production DB — Read-Only Access

The production database can be inspected (never written) from a dev machine via VPN +
SSH tunnel as the SELECT-only `parkflow_readonly` role. Full setup — SSH config, tunnel,
psql/GUI connection, and registering the `postgres-prod` Claude Code MCP for read-only
SQL straight from Claude — lives in
[`docs/prod-db-readonly-access.md`](docs/prod-db-readonly-access.md).

```bash
ssh -f -N parkflow   # tunnel on localhost:15432, then connect as parkflow_readonly
```

> [!WARNING]
> All prod changes go through CI/CD — never write to the prod DB or touch its containers by hand.

---

## 🧪 Testing

### ⚙️ Backend

```bash
cd backend
bun run test            # run all test suites (vitest run)
bun run test --coverage # with coverage report
```

The suite covers every REST route group, the auth middleware, the owner day-status flows, and the reminder scheduler using Vitest + Supertest — 260+ test cases across 18 suites.

> [!WARNING]
> Use `bun run test` (Vitest), never bare `bun test` — Bun's own runner ignores `vi.mock`, which makes the auth-mocked suites fail with spurious `401`s.

### 🖥️ Frontend

```bash
cd frontend
bun run test    # vitest run
```

Frontend suites are colocated next to the code they cover (e.g. `hooks/useEffectiveSpots.test.ts`).

---

## ✅ Code Quality

Both `frontend/` and `backend/` share the same standards:

```bash
bun lint            # ESLint check  (equivalent to: bun run lint)
bun run lint:fix    # Auto-fix lint issues
bun run format      # Prettier formatting
bun run lint:all    # lint:fix + format in one step (frontend & backend)
```

> [!TIP]
> `bun run lint:all` runs lint fixes and Prettier formatting in one step — run it before every commit.

**Enforced rules:**

- 🚫 No `any` types — use proper types or `unknown` with narrowing
- 🎨 Tailwind utility classes only — no separate CSS files
- 💅 Prettier: `semi: false`, `singleQuote: true`, `trailingComma: all`
- 📝 Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- 📱 Mobile-first design
- 🔒 No hardcoded secrets — use `.env` files
- ♿ Accessibility enforced via `eslint-plugin-jsx-a11y` (frontend)
- 📦 Import order enforced via `eslint-plugin-simple-import-sort` (frontend)

---

## 🗺️ Roadmap

### 📌 Planned

- 🧠 **Smart suggestions** — scoring algorithm to recommend the best available spot (floor preference, proximity, EV/compact filters)
- 🔥 **Map heatmap overlay** — project the historical peak-hours data (already on the Stats page) onto the SVG floor map

---

## 🎨 Interface Design System

The project uses the [`interface-design`](https://github.com/anthropics/claude-code-skills) Claude Code skill to maintain UI/UX consistency across the frontend.

### `.interface-design/system.md`

The file `.interface-design/system.md` is the **single source of truth for all visual decisions** — spacing scale, color tokens, radius, depth strategy, typography, component patterns (cards, tables, buttons, badges, toolbars, etc.), and explicit do-nots.

It was extracted from the existing codebase and must be updated whenever a new pattern is introduced. Think of it like a living style guide that Claude reads before touching any frontend code.

### Available commands (in Claude Code)

| Command | What it does |
|---|---|
| `/interface-design:extract` | Scans all `*.tsx` files and extracts spacing, radius, color, and component patterns into `system.md` |
| `/interface-design:audit` | Checks a file or component against `system.md` for violations (wrong spacing, inconsistent depth, etc.) |
| `/interface-design:critique` | Reviews the last built component with a design-lead eye — finds places that defaulted instead of decided, then rebuilds them |
| `/interface-design:init` | Builds new UI components with craft and consistency, guided by `system.md` |
| `/interface-design:status` | Shows the current design direction, tokens, and patterns in `system.md` |

### Workflow

When building or modifying frontend UI:

1. The skill reads `system.md` first — all established patterns apply automatically
2. New components should follow existing patterns (spacing grid, depth strategy, color tokens)
3. After building something new, run `/interface-design:critique` to catch defaults
4. If a new reusable pattern emerges, update `system.md`

---

## 🤝 Contributing

1. 🌿 Branch from `main` using a descriptive branch name
2. 📝 Follow the conventional commit format (`feat:`, `fix:`, etc.)
3. ✅ Run `bun run lint:all` and `bun run test` before opening a PR
4. 🎯 Target `main` for pull requests

---

<div align="center">

[Repository](https://git.matheo.si/jakobo/parkflow) · [Report an issue](https://git.matheo.si/jakobo/parkflow/-/issues)

</div>
