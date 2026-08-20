<div align="center">

# 🖥️ ParkFlow Frontend

**The React SPA users actually park with.**
Interactive parking map, presence-aware booking, owner portal, and admin panel — talking to the ParkFlow API.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Mantine](https://img.shields.io/badge/Mantine-8-339AF0?style=flat-square&logo=mantine&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-package_manager-000000?style=flat-square&logo=bun&logoColor=white)

</div>

---

## 📑 Contents

- [⚡ Quick Start](#-quick-start)
- [📜 Scripts](#-scripts)
- [🛠️ Stack](#️-stack)
- [📁 Layout](#-layout)
- [🧭 Routes](#-routes)
- [🔑 Environment Variables](#-environment-variables)
- [🧪 Testing](#-testing)
- [✅ Conventions](#-conventions)
- [🐳 Docker](#-docker)

---

## ⚡ Quick Start

```bash
bun install
cp .env.example .env    # then edit — see Environment Variables
bun dev                 # http://localhost:5173
```

> [!IMPORTANT]
> The app needs the ParkFlow backend running at `VITE_API_URL` (default `http://localhost:3001`) and a reachable Authentik SSO instance — login is OAuth-only, there is no local password form.

---

## 📜 Scripts

| Script | What it does |
| --- | --- |
| 🚀 `bun dev` | Vite dev server with HMR on port 5173 |
| 📦 `bun run build` | `tsc -b` typecheck, then production bundle to `dist/` |
| 👀 `bun run preview` | Serve the built `dist/` locally |
| 🔍 `bun run lint` | ESLint check |
| 🔧 `bun run lint:fix` | ESLint with `--fix` |
| 💅 `bun run format` | Prettier over `src/**/*.{ts,tsx,css}` |
| ✅ `bun run lint:all` | `lint:fix` + `format` in one step |
| 🧪 `bun run test` | Vitest, single run |
| 🔁 `bun run test:watch` | Vitest in watch mode |

> [!TIP]
> Run `bun run lint:all` after any code change — it is the one command that leaves the tree in a committable state.

---

## 🛠️ Stack

| Layer | Technology |
| --- | --- |
| ⚛️ Framework | React 19 + TypeScript 5.9 |
| ⚡ Build | Vite 7 |
| 🎨 UI | Mantine 8 + Tailwind CSS 4, with local primitives in `components/ui` |
| 🌍 i18n | i18next + react-i18next (English / Slovenian) |
| 🗃️ State | Zustand 5 |
| 🔄 Data fetching | TanStack Query 5 |
| 🧭 Routing | TanStack Router 1.162 (generated `routeTree.gen.tsx`) |
| 🖼️ Icons | Lucide React |
| 🧪 Testing | Vitest 4 + Testing Library on jsdom |

---

## 📁 Layout

```text
frontend/
├── src/
│   ├── api/                # Typed fetch wrappers per resource
│   ├── components/         # Shared UI
│   │   ├── Layout/         # Sidebar, mobile nav, banners, scroll-to-top
│   │   ├── ParkingMap/     # SVG canvas with zoom/pan/pinch
│   │   ├── SpotGrid/       # Responsive spot card grid
│   │   ├── SpotModal/      # Spot detail + booking + owner controls
│   │   └── ui/             # Local primitives (Mantine + Tailwind wrappers)
│   ├── hooks/              # TanStack Query hooks (useSpots, useEffectiveSpots, …)
│   ├── i18n/               # i18next config + en/sl locale files
│   ├── lib/                # Shared helpers (datetime, spots, utils)
│   ├── pages/              # One folder or file per route
│   ├── store/              # Zustand stores (auth, UI, prefs, lot selection)
│   ├── types/              # Shared TypeScript interfaces
│   ├── __tests__/          # Vitest setup
│   └── routeTree.gen.tsx   # Generated — do not edit by hand
├── nginx.conf              # Serves dist/ and proxies /api/ in the prod image
├── Dockerfile              # Multi-stage build → nginx
└── Dockerfile.dev          # Dev image with hot reload
```

---

## 🧭 Routes

| Path | Page |
| --- | --- |
| `/` | Interactive parking map |
| `/dashboard` | Occupancy overview + activity feed |
| `/stats` | Analytics, per-floor breakdown, peak-hours heatmap |
| `/my-bookings` | Own reservations, active and history |
| `/my-parking` | Owner portal — availability per day |
| `/profile` | Preferences, attendance, active booking |
| `/owners` | Owner administration |
| `/admin` | Lots + spots administration |
| `/admin/feedback` | Feedback triage |
| `/map-editor` | Draw and reposition spot coordinates |
| `/login`, `/callback` | Authentik SSO entry and OAuth redirect |

---

## 🔑 Environment Variables

All build-time (`import.meta.env`) — Vite inlines them, so nothing here may be secret.

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_URL` | ⚙️ Backend base URL | `http://localhost:3001` |
| `VITE_OAUTH_AUTHORITY` | 🔗 Authentik OAuth authority URL | `https://sso.matheo.si/application/o/park-flow` |
| `VITE_OAUTH_CLIENT_ID` | 🪪 OAuth client ID | `V9RNWkqNeQq8Fhn…` |
| `VITE_OAUTH_REDIRECT_URI` | 🔄 OAuth redirect URI | `http://localhost:5173/callback` |
| `VITE_OAUTH_ADMIN_GROUP` | 👥 Admin group name — must match the backend | `parkflow-admins` |

> [!CAUTION]
> Never put a secret in a `VITE_`-prefixed variable. It is compiled into the JavaScript bundle and readable by anyone loading the page.

---

## 🧪 Testing

```bash
bun run test
```

Suites are colocated next to the code they cover (e.g. `src/hooks/useEffectiveSpots.test.ts`); `src/__tests__/setup.ts` holds the shared Vitest setup.

---

## ✅ Conventions

| Rule | Detail |
| --- | --- |
| 🚫 No `any` | Use a real type, or `unknown` with narrowing |
| 🎨 Tailwind only | Utility classes — no separate CSS files |
| 🧩 Mantine first | Reach for a Mantine component before building one; Tailwind utilities only when Mantine has no fit |
| 💅 Prettier | `semi: false`, `singleQuote: true`, `trailingComma: all` |
| 📦 Import order | Enforced by `eslint-plugin-simple-import-sort` |
| ♿ Accessibility | Enforced by `eslint-plugin-jsx-a11y` |
| 📱 Mobile-first | Design and test the small viewport first |
| 📝 Commits | Conventional: `feat:`, `fix:`, `chore:`, `refactor:` |

> [!WARNING]
> Tailwind utilities lose to Mantine's own CSS. Mantine's stylesheet is unlayered while Tailwind v4 emits utilities inside `@layer utilities`, and unlayered rules win regardless of import order — so a class like `fixed` on a Mantine component silently does nothing. Put layout and positioning on a plain wrapper element instead.

---

## 🐳 Docker

```bash
# from the repo root
docker compose -f docker-compose.dev.yml up   # hot reload
docker compose up --build                     # production build
```

The production image builds with Bun, then serves `dist/` from nginx on port 3000 using `nginx.conf`.

---

<div align="center">

[Project README](../README.md) · [Report an issue](https://git.matheo.si/jakobo/parkflow/-/issues)

</div>
