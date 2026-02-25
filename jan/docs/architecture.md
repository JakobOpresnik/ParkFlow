# Architecture & Technical Decisions

## Stack Decisions

### Database: Local PostgreSQL
**Why:** Simple, reliable, no external dependencies. `pg` library connects directly. Full SQL control. Easy to inspect with any PostgreSQL client (TablePlus, DBeaver, psql).

### Real-time: React Query Polling
**Why:** No WebSocket infrastructure needed. `refetchInterval: 15_000` refreshes spot data every 15 seconds — sufficient for office parking. If true real-time is needed later, add PostgreSQL LISTEN/NOTIFY + a `/api/events` SSE endpoint without changing the frontend much.

### Map: SVG Overlay on Static Image
**Why:** Simple and maintainable. CAD image stays as-is. SVG polygons are positioned on top via absolute positioning. No external map library needed. Coordinates stored in `spot-coordinates.json` and in `spots.coordinates` (JSONB) in the DB.

### Backend: Node.js + Express
**Why:** Thin API layer between frontend and PostgreSQL. Business logic stays server-side. `pg` Pool handles connection management.

### No Auth (MVP)
**Why:** Internal network use only. Can be added later with a simple JWT + middleware layer without major refactor.

---

## Data Flow

```
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

## Database Migrations
SQL files in `backend/migrations/` numbered sequentially:
```
001_initial.sql    — create owners + spots tables
002_*.sql          — future changes
```

Run manually:
```bash
psql $DATABASE_URL -f backend/migrations/001_initial.sql
```

---

## Spot Coordinate Format

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

`points` is an SVG polygon points string. Coordinates are relative to the displayed image dimensions. Use `docs/map-tool.html` to generate these from the actual CAD image.

---

## Security Notes (MVP)
- No auth — internal network only
- No secrets on frontend — only `VITE_API_URL`
- DATABASE_URL stays on backend only
- CORS configured to allow only localhost in dev
