# 🅿️ ParkFlow

> **Smart parking management for modern offices**

A real-time parking management system for office buildings. ParkFlow gives employees a live view of parking availability across multiple floors, lets them reserve open spots with one click, and provides analytics on usage patterns — all from a mobile-friendly web app.

> ⚠️ **Note:** This is a frontend-only demo powered by mock data. There is no backend or database — all state lives in memory and resets on page refresh.

---

## 📑 Table of Contents

- ✨ [Features](#-features)
  - 📊 [Dashboard](#-dashboard)
  - 🗺️ [Parking Spaces](#️-parking-spaces)
  - 📅 [My Bookings](#-my-bookings)
  - 📉 [Reports & Analytics](#-reports--analytics)
  - 👤 [Profile & Preferences](#-profile--preferences)
  - 🔧 [Other](#-other)
- 🛠️ [Tech Stack](#️-tech-stack)
- 📋 [Prerequisites](#-prerequisites)
- 🚀 [Getting Started](#-getting-started)
- 📜 [Available Scripts](#-available-scripts)
- 📁 [Project Structure](#-project-structure)
- 📄 [License](#-license)

---

## ✨ Features

### 📊 Dashboard

- 🔢 **Live occupancy overview** — summary cards showing total, available, occupied, and reserved spots at a glance
- 🍩 **Per-floor ring charts** — visual breakdown of occupancy for each garage floor (B1, B2, B3)
- 🧠 **Smart suggestions** — AI-style recommendations for the best available spots based on preferred floor, proximity to elevators, historical reliability, and spot type
- 📡 **Live activity feed** — real-time scrolling feed of parking events (arrivals, departures, reservations)
- 📈 **Weekly occupancy chart** — bar chart showing parking trends across the work week

### 🗺️ Parking Spaces

- 🟢 **Interactive parking map** — grid-based floor plan with color-coded spots (green = available, red = occupied, violet = reserved)
- ⚡ **One-click reservations** — tap any available spot to reserve it instantly
- 🌡️ **Heatmap view** — toggle to a historical heatmap showing how frequently each spot is used over time
- 🔍 **Spot detail modal** — view spot info, owner, type (standard / EV / handicap), and take action

### 📅 My Bookings

- 🎫 **Active reservations list** — view all your current bookings with spot details and a visual timeline
- ❌ **Cancel reservations** — release a spot you no longer need with one tap

### 📉 Reports & Analytics

- 📏 **Utilization metrics** — overall usage percentage, available/in-use counts, and total capacity
- 🏢 **Floor breakdown table** — per-floor stats with segmented progress bars (occupied / reserved / available)
- 📊 **Weekly occupancy chart** — same trend chart as the dashboard for deeper analysis

### 👤 Profile & Preferences

- 🪪 **Employee profile card** — name, department, attendance status, and assigned permanent spot
- 🏗️ **Preferred floor setting** — choose your default floor, which also influences smart suggestions
- 🔔 **Notification preferences** — toggle reservation confirmations and availability alerts

### 🔧 Other

- 🔎 **Global search** — search for any spot or employee across all floors from the header
- 🔔 **In-app notifications** — bell icon with unread count and a notification popover
- 🚨 **Report a problem** — submit issues (damaged spots, lighting, access) via a built-in form
- 📱 **Mobile-first design** — fully responsive layout with collapsible sidebar navigation

---

## 🛠️ Tech Stack

| Category            | Technology            |
| ------------------- | --------------------- |
| ⚛️ Framework        | React 19 + TypeScript |
| ⚡ Build tool       | Vite 7                |
| 🎨 UI components    | Mantine 8             |
| 💨 Styling          | Tailwind CSS 4        |
| 🖼️ Icons            | Lucide React          |
| 📊 Charts           | Recharts              |
| 🐻 State management | Zustand               |
| 🔄 Data fetching    | TanStack Query        |
| 🧭 Routing          | TanStack Router       |

---

## 📋 Prerequisites

- 🟢 **Node.js** >= 18
- 📦 **pnpm** >= 9 — install it with `npm install -g pnpm` if you don't have it

---

## 🚀 Getting Started

**1️⃣ Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/parkflow.git
cd parkflow
```

**2️⃣ Install dependencies**

```bash
pnpm install
```

**3️⃣ Start the development server**

```bash
pnpm dev
```

The app will be available at **http://localhost:5173** (Vite's default port).

**4️⃣ Open in your browser**

Navigate to `http://localhost:5173`. You're logged in as **Alex Morgan** by default — explore the dashboard, reserve spots, and check out the analytics. 🎉

---

## 📜 Available Scripts

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | 🟢 Start the development server with hot reload |
| `pnpm build`        | 🏗️ Type-check and create a production build     |
| `pnpm preview`      | 👀 Preview the production build locally         |
| `pnpm lint`         | 🔍 Run ESLint                                   |
| `pnpm lint:fix`     | 🔧 Run ESLint with auto-fix                     |
| `pnpm format`       | ✨ Format all source files with Prettier        |
| `pnpm format:check` | ✅ Check formatting without writing changes     |

---

## 📁 Project Structure

```
src/
  📦 components/    Reusable UI components (ParkingMap, SpotDetailModal, Layout, etc.)
  🧭 routes/        Page components — one file per route (index, parking, booking, analytics, profile)
  🗃️ store/         Zustand stores (parking state, notifications, activity feed)
  🪝 hooks/         Custom hooks (data fetching, smart suggestions, activity feed)
  📝 types/         Shared TypeScript interfaces
  🗂️ data/          Mock JSON data (spots, attendance, layouts, heatmaps)
  ⚙️ main.tsx       App entry point
  🎨 index.css      Tailwind + Mantine style imports
```

---

## 📄 License

This project is for internal / demo use.
