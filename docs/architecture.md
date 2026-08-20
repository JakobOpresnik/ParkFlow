<div align="center">

# 🏗️ Architecture & Technical Decisions

**Why ParkFlow is built the way it is.**
The original MVP stack choices, data flow, migration convention, and coordinate format.

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-local-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Express](https://img.shields.io/badge/Express-API_layer-000000?style=flat-square&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-SVG_overlay-61DAFB?style=flat-square&logo=react&logoColor=black)

</div>

> [!WARNING]
> This document records the **original MVP decisions** and has not tracked every change since. Several entries below — notably auth, real-time transport, and how migrations run — have been superseded. Treat the [project README](../README.md) as the source of truth for current behaviour.

---

## 📑 Contents

- [⚡ Stack Decisions](#-stack-decisions)
- [🔄 Data Flow](#-data-flow)
- [🗄️ Database Migrations](#️-database-migrations)
- [📐 Spot Coordinate Format](#-spot-coordinate-format)
- [🔒 Security Notes (MVP)](#-security-notes-mvp)

---

## ⚡ Stack Decisions

| Decision | Why |
| --- | --- |
| 🐘 **Database: local PostgreSQL** | Simple, reliable, no external dependencies. The `pg` library connects directly, giving full SQL control. Inspectable with any PostgreSQL client (TablePlus, DBeaver, psql). |
| 🔄 **Real-time: React Query polling** | No WebSocket infrastructure needed. `refetchInterval: 15_000` refreshes spot data every 15 seconds — sufficient for office parking. If true real-time is needed later, add PostgreSQL LISTEN/NOTIFY plus an `/api/events` SSE endpoint without changing the frontend much. |
| 🗺️ **Map: SVG overlay on a static image** | Simple and maintainable. The CAD image stays as-is; SVG polygons sit on top via absolute positioning, so no external map library is needed. Coordinates live in `spot-coordinates.json` and in `spots.coordinates` (JSONB). |
| 🚂 **Backend: Node.js + Express** | A thin API layer between frontend and PostgreSQL. Business logic stays server-side; the `pg` Pool handles connection management. |
| 🔓 **No auth (MVP)** | Internal network use only. Can be added later with a simple JWT + middleware layer without a major refactor. |

---

## 🔄 Data Flow

```text
User clicks spot on map
  → React onSpotClick
  → SpotCard opens (data from React Query cache)
  → User clicks "Assign Owner"
  → AssignOwner modal → PATCH /api/spots/:id/owner
  → Express updates PostgreSQL
  → React Query refetches spots (or invalidates cache immediately)
  → Map updates with new status color
```

---

## 🗄️ Database Migrations

SQL files in `backend/migrations/`, numbered sequentially:

| File | Contents |
| --- | --- |
| `001_initial.sql` | Create `owners` + `spots` tables |
| `002_*.sql` | Future changes |

Run manually:

```bash
psql $DATABASE_URL -f backend/migrations/001_initial.sql
```

---

## 📐 Spot Coordinate Format

Stored in `docs/spot-coordinates.json` and in `spots.coordinates` (JSONB):

```json
{
  "imageWidth": 1200,
  "imageHeight": 800,
  "spots": [
    {
      "number": 1,
      "points": "100,200 150,200 150,260 100,260"
    }
  ]
}
```

`points` is an SVG polygon points string. Coordinates are relative to the displayed image dimensions.

> [!TIP]
> Use `docs/map-tool.html` to generate these from the actual CAD image.

---

## 🔒 Security Notes (MVP)

| Area | Position |
| --- | --- |
| 🔓 Auth | None — internal network only |
| 🖥️ Frontend secrets | None — only `VITE_API_URL` |
| 🔑 `DATABASE_URL` | Backend only |
| 🌐 CORS | Configured to allow only localhost in dev |

---

<div align="center">

[Project README](../README.md) · [Report an issue](https://git.matheo.si/jakobo/parkflow/-/issues)

</div>
