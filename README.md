# 🅿️ ParkFlow

> 🚗 Smart parking management for multi-lot facilities — real-time spot tracking, booking, and administration.

ParkFlow is a full-stack web application built for internal parking management at facilities with multiple lots. It provides a live SVG map overlay on CAD floor plans, a booking system, role-based administration, and a full audit log.

---

## 📋 Table of Contents

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
- [🧪 Testing](#-testing)
- [✅ Code Quality](#-code-quality)
- [🗺️ Roadmap](#️-roadmap)

---

## ✨ Features

### 🏢 Parking Management

- 🗂️ **Multi-lot support** — manage multiple parking locations (floors, zones, areas) independently
- 🔴🟢 **Real-time spot status** — each spot reflects its live state: `free`, `occupied`, or `reserved`
- 🗺️ **SVG map overlay** — interactive parking map drawn over real CAD floor plans with zoom, pan, and pinch-to-zoom
- ✏️ **Visual map editor** — admin tool to draw and reposition spot coordinates directly on the floor plan image, persisted to the database

### 📅 Booking System

- 🖱️ Users can book free spots directly from the map or spot grid
- ⏱️ Bookings auto-expire after 8 hours
- 📜 Full booking history with status tracking (`active`, `cancelled`, `expired`)

### 🔧 Administration

- 🛡️ **Admin panel** with full CRUD for parking lots, spots, and owners
- 👤 **Owner assignment** — link spots to named vehicle owners with contact info and plate numbers
- 📋 **Audit log** — every spot status change is recorded with who changed it, when, and the before/after values

### 🔐 Authentication & Access Control

- 🔑 JWT-based authentication with `admin` and `user` roles
- 🚫 Admin-only routes for all write operations
- 🔗 OAuth (Authentik SSO) integration in progress

### 🎨 UI/UX

- 🌙 Dark mode toggle
- 📱 Mobile-first responsive design
- 🪟 Spot detail modal with inline booking, owner info, and status management

---

## 🛠️ Tech Stack

### 🖥️ Frontend (`/frontend`)

| Layer              | Technology                 |
| ------------------ | -------------------------- |
| ⚛️ Framework       | React 19 + TypeScript 5.9       |
| ⚡ Build           | Vite 7                          |
| 🎨 UI              | Mantine 8 + Tailwind CSS 4      |
| 🗃️ State           | Zustand 5                       |
| 🔄 Data Fetching   | TanStack Query 5           |
| 🧭 Routing         | TanStack Router 1.16       |
| 🖼️ Icons           | Lucide React               |
| 🧪 Testing         | Vitest 4                   |
| 📦 Package Manager | Bun                        |

### ⚙️ Backend (`/backend`)

| Layer              | Technology                        |
| ------------------ | --------------------------------- |
| 🚂 Framework       | Express 5                         |
| 🐘 Database        | PostgreSQL 16                     |
| 🔒 Auth            | JWT (jsonwebtoken 9) + bcryptjs 3 |
| 🔌 DB Client       | node-postgres (pg 8)              |
| 🧪 Testing         | Vitest 4 + Supertest 7            |
| 📦 Package Manager | Bun                               |

---

## 📁 Project Structure

```
parkflow/
├── 🖥️  frontend/                   # React SPA
│   ├── src/
│   │   ├── api/                # Typed API client wrappers
│   │   ├── components/         # Shared UI components
│   │   │   ├── ParkingMap/     # SVG canvas with zoom/pan
│   │   │   ├── SpotGrid/       # Responsive spot card grid
│   │   │   ├── SpotModal/      # Spot detail + booking modal
│   │   │   └── ui/             # shadcn/ui primitives
│   │   ├── hooks/              # React Query hooks (useSpots, useBookings, …)
│   │   ├── pages/              # Route-level page components
│   │   ├── store/              # Zustand state (auth, UI, lot selection)
│   │   └── types/              # Shared TypeScript interfaces
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── ⚙️  backend/                    # Express REST API
│   ├── src/
│   │   ├── routes/             # Route handlers (spots, owners, lots, bookings, auth, changes)
│   │   ├── middleware/         # JWT auth, error handler
│   │   ├── db/                 # pg connection pool
│   │   └── __tests__/          # Vitest + Supertest test suites
│   ├── migrations/             # Ordered SQL migration files (auto-run on startup)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── 🎨  jakob/                      # UI prototype (Mantine 8 + mock data, reference only)
├── 🐳  docker-compose.yml          # Production deployment
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

**Production build:**

```bash
docker compose up --build
```

Database migrations run automatically on first startup. A default admin account is seeded:

| Field       | Value   |
| ----------- | ------- |
| 👤 Username | `admin` |
| 🔑 Password | `admin` |

> ⚠️ Change the admin password immediately after first login in a production environment.

---

### 🔧 Manual Setup

**1. Clone and configure environment variables**

```bash
git clone <repo-url>
cd parkflow
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files — see [🔑 Environment Variables](#-environment-variables).

**2. Start PostgreSQL**

Ensure a PostgreSQL 16 instance is running and accessible via the `DATABASE_URL` in `backend/.env`.

**3. Run the backend**

```bash
cd backend
bun install
bun run dev        # starts on port 3001, runs migrations automatically
```

**4. Run the frontend**

```bash
cd frontend
bun install
bun run dev        # starts on port 5173
```

---

## 🔑 Environment Variables

### ⚙️ Backend (`backend/.env`)

| Variable                 | Description                              | Example                                                  |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`           | 🐘 PostgreSQL connection string          | `postgresql://parkflow:parkflow@localhost:5432/parkflow` |
| `PORT`                   | 🔌 API server port                       | `3001`                                                   |
| `JWT_SECRET`             | 🔒 Secret key for signing JWTs           | `your-secret-here`                                       |
| `AUTHENTIK_USERINFO_URL` | 🔗 Authentik SSO userinfo endpoint       | `https://sso.example.com/application/o/userinfo/`        |
| `AUTHENTIK_ADMIN_GROUP`  | 👥 SSO group name that grants admin role | `parkflow-admins`                                        |

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

All write endpoints require an `Authorization: Bearer <token>` header. Admin-only endpoints additionally require the `admin` role.

### 🅿️ Spots

| Method   | Endpoint                     | Description                           | Auth     |
| -------- | ---------------------------- | ------------------------------------- | -------- |
| `GET`    | `/api/spots`                 | List all spots (filter by `?lot_id=`) | —        |
| `GET`    | `/api/spots/:number`         | Get single spot by number             | —        |
| `POST`   | `/api/spots`                 | Create a spot                         | 🛡️ Admin |
| `PUT`    | `/api/spots/:id`             | Update spot details                   | 🛡️ Admin |
| `DELETE` | `/api/spots/:id`             | Delete a spot                         | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/owner`       | Assign an owner to a spot             | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/status`      | Change spot status                    | 🛡️ Admin |
| `PATCH`  | `/api/spots/:id/coordinates` | Update SVG map coordinates            | 🛡️ Admin |

### 👤 Owners

| Method   | Endpoint          | Description          | Auth     |
| -------- | ----------------- | -------------------- | -------- |
| `GET`    | `/api/owners`     | List all owners      | —        |
| `POST`   | `/api/owners`     | Create an owner      | 🛡️ Admin |
| `PUT`    | `/api/owners/:id` | Update owner details | 🛡️ Admin |
| `DELETE` | `/api/owners/:id` | Delete an owner      | 🛡️ Admin |

### 🏢 Parking Lots

| Method   | Endpoint        | Description           | Auth     |
| -------- | --------------- | --------------------- | -------- |
| `GET`    | `/api/lots`     | List all parking lots | —        |
| `POST`   | `/api/lots`     | Create a lot          | 🛡️ Admin |
| `PUT`    | `/api/lots/:id` | Update lot details    | 🛡️ Admin |
| `DELETE` | `/api/lots/:id` | Delete a lot          | 🛡️ Admin |

### 📅 Bookings

| Method  | Endpoint                   | Description                 | Auth    |
| ------- | -------------------------- | --------------------------- | ------- |
| `GET`   | `/api/bookings/my`         | Get current user's bookings | 🔑 User |
| `POST`  | `/api/bookings`            | Book a free spot            | 🔑 User |
| `PATCH` | `/api/bookings/:id/cancel` | Cancel a booking            | 🔑 User |

### 🔐 Auth & Audit

| Method | Endpoint          | Description                                  | Auth    |
| ------ | ----------------- | -------------------------------------------- | ------- |
| `POST` | `/api/auth/login` | Login with username + password               | —       |
| `GET`  | `/api/auth/me`    | Get current user info                        | 🔑 User |
| `GET`  | `/api/changes`    | Spot change audit log (filter by `?lot_id=`) | —       |
| `GET`  | `/health`         | Health check                                 | —       |

---

## 🗄️ Database Schema

Seven PostgreSQL tables managed via ordered SQL migrations in `backend/migrations/`:

```
👤  owners          — Vehicle owners linked to reserved spots
🅿️  spots           — Individual parking spots with status and coordinates
🏢  parking_lots    — Multi-lot groupings (floors, zones)
🔑  app_users       — Application users with hashed passwords and roles
📅  bookings        — Parking reservations with auto-expiry
📋  spot_changes    — Full audit log of every spot status change
```

**🔴🟢🟡 Spot statuses:** `free` | `occupied` | `reserved`

**👑🧑 User roles:** `admin` | `user`

Migrations run automatically at backend startup. To apply them manually:

```bash
cd backend
bun run migrate
```

---

## 🧪 Testing

### ⚙️ Backend

```bash
cd backend
bun test               # run all test suites
bun test --coverage    # with coverage report
```

The test suite covers all REST route handlers using Vitest + Supertest with 46+ test cases.

### 🖥️ Frontend

```bash
cd frontend
bun test
```

---

## ✅ Code Quality

Both `frontend/` and `backend/` share the same standards:

```bash
bun run lint        # ESLint check
bun run lint:fix    # Auto-fix lint issues
bun run format      # Prettier formatting
```

**Enforced rules:**

- 🚫 No `any` types — use proper types or `unknown` with narrowing
- 🎨 Tailwind utility classes only — no separate CSS files
- 💅 Prettier: `semi: false`, `singleQuote: true`, `trailingComma: all`
- 📝 Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- 📱 Mobile-first design
- 🔒 No hardcoded secrets — use `.env` files

---

## 🗺️ Roadmap

### 🔄 In Progress

- 🔗 OAuth (Authentik SSO) full backend integration

### 📌 Planned

- 📊 **Dashboard** — occupancy ring charts, weekly usage bar chart, live activity feed
- 📈 **Analytics page** — per-floor breakdown, utilization metrics, stacked progress bars
- 🧠 **Smart suggestions** — scoring algorithm to recommend the best available spot (floor preference, proximity, EV/compact filters)
- 🔥 **Heatmap view** — historical occupancy overlay on the SVG floor map
- 👤 **Profile page** — user preferences, attendance stats, vehicle settings

---

## 🤝 Contributing

1. 🌿 Branch from `main` using a descriptive branch name
2. 📝 Follow the conventional commit format (`feat:`, `fix:`, etc.)
3. ✅ Run `bun run lint` and `bun test` before opening a PR
4. 🎯 Target `main` for pull requests
