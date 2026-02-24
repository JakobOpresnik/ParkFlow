# ParkFlow - Development Guide

## Project Overview

Internal parking management system. React SPA with mock data (no backend yet).

## Tech Stack

- **Runtime**: React 19 + TypeScript (Vite 7)
- **UI**: Mantine 8 + Tailwind CSS 4 (utility classes only, no separate CSS files)
- **Icons**: Lucide React
- **Charts**: Recharts
- **State**: Zustand
- **Data fetching**: TanStack Query
- **Routing**: TanStack Router (manual route tree, no code-gen plugin)
- **Package manager**: pnpm (never use npm or yarn)
- **Linting**: ESLint with Prettier integration
- **Formatting**: Prettier (semi: false, singleQuote: true, trailingComma: all)

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Type-check + production build
- `pnpm lint` — Run ESLint
- `pnpm lint:fix` — Auto-fix lint issues
- `pnpm format` — Format all source files
- `pnpm format:check` — Check formatting without writing

## Project Structure

```
src/
  components/    — Reusable UI components
  routes/        — Page-level route components (one per route)
  store/         — Zustand stores
  hooks/         — Custom React hooks (TanStack Query wrappers)
  types/         — Shared TypeScript interfaces
  data/          — Mock JSON data files
  routeTree.gen.ts — Manual route tree (update when adding routes)
  main.tsx       — App entry (MantineProvider, QueryClient, Router)
  index.css      — Tailwind + Mantine style imports only
```

## Key Conventions

### Routing

Routes use `createRoute()` from TanStack Router with explicit `getParentRoute` and `path`. No file-based code generation. When adding a new route:

1. Create `src/routes/myroute.tsx` with `createRoute({ getParentRoute: () => rootRoute, path: '/myroute', component: MyRoute })`
2. Add the export to `src/routeTree.gen.ts`
3. Add nav entry in `src/components/Layout.tsx` `navItems` array

### Mantine + TanStack Router Integration

Use Mantine's `renderRoot` prop for polymorphic link components (never use `as any` casts):

```tsx
<NavLink renderRoot={(props) => <Link to="/path" {...props} />} label="Label" />
```

### Styling

- Use Tailwind utility classes exclusively. No CSS modules, no separate `.css` files.
- Use Mantine components for layout, inputs, modals, badges, alerts, progress, etc.
- Use Tailwind for fine-grained spacing, colors, and custom styling on native elements.
- Custom theme colors are defined in `src/index.css` under `@theme`.

### State Management

- `parkingStore` — Parking spots, floor selection, reservations. Recomputes spot statuses from mock data + reservations.
- `notificationStore` — In-app notifications. Toast display handled by Mantine `<Notifications />`.

### Data Flow (Mock)

- `src/data/permanent_spots.json` — Assigned parking spots with owners
- `src/data/attendance.json` — Employee attendance status for the day
- `src/data/parking_layout.json` — Physical grid layout per floor
- Spot status is computed by cross-referencing permanent owners with attendance: if owner is not "In-Office", their spot flips to "available".

### Types

All shared types live in `src/types/index.ts`. Key types: `ParkingSpot`, `SpotStatus` (occupied | available | reserved | unavailable), `AttendanceStatus`, `FloorId`.

## Rules for AI Assistants

1. Always run `pnpm build` after changes to verify TypeScript + build passes.
2. Always run `pnpm lint:all` before finishing.
3. Never introduce `any` types — find the proper type or use `unknown` with narrowing.
4. Keep components small. One component per file, co-located with its route if page-specific.
5. Prefer Mantine components over hand-rolled HTML for interactive UI elements.
6. Use Tailwind for styling, not inline `style` props (except for Mantine `styles` API).
7. Do not create new CSS files. All custom values go in `@theme` in `index.css`.
8. When modifying mock data structure, update corresponding types in `src/types/index.ts`.
9. Test on mobile viewport first — this is a mobile-first app.
