// Route tree — update this file when adding new routes via /add-route
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { Layout } from '@/components/Layout'
import { AdminFeedbackPage } from '@/pages/AdminFeedbackPage'
import { AdminPage } from '@/pages/AdminPage'
import { CallbackPage } from '@/pages/CallbackPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { MapEditorPage } from '@/pages/MapEditorPage'
import { MapPage } from '@/pages/MapPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { OwnerParkingPage } from '@/pages/OwnerParkingPage'
import { OwnersPage } from '@/pages/OwnersPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { StatsPage } from '@/pages/StatsPage'
import { authInitPromise, useAuthStore } from '@/store/authStore'

export const DEEP_LINK_SPOT_KEY = 'parkflow:deepLinkSpot'
export const DEEP_LINK_DATE_KEY = 'parkflow:deepLinkDate'

async function requireAuth({ location }: { location: { href: string } }) {
  await authInitPromise
  const { user } = useAuthStore.getState()
  if (!user) {
    // Preserve a ?spot= / ?date= deep-link across the login redirect so the map
    // can highlight the spot and open the right day once the user is
    // authenticated (works for SSO + guest).
    try {
      const params = new URL(location.href, window.location.origin).searchParams
      const spot = params.get('spot')
      if (spot) sessionStorage.setItem(DEEP_LINK_SPOT_KEY, spot)
      const date = params.get('date')
      if (date) sessionStorage.setItem(DEEP_LINK_DATE_KEY, date)
    } catch {
      // ignore malformed URL
    }
    throw redirect({ to: '/login' })
  }
}

async function requireNonGuest() {
  await authInitPromise
  const { user } = useAuthStore.getState()
  if (!user) throw redirect({ to: '/login' })
  if (user.role === 'guest') throw redirect({ to: '/' })
}

// Root — bare Outlet (no layout of its own)
const rootRoute = createRootRoute({ component: Outlet })

// Login — outside the sidebar layout
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

// OAuth callback — outside the sidebar layout
const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  component: CallbackPage,
})

// Full-screen layout for the map page (no padding, no max-width)
const mapLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'map-layout',
  beforeLoad: requireAuth,
  component: () => (
    <Layout noPadding>
      <Outlet />
    </Layout>
  ),
})

// Dashboard layout wraps all other app pages
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  beforeLoad: requireAuth,
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const mapRoute = createRoute({
  getParentRoute: () => mapLayoutRoute,
  path: '/',
  validateSearch: (
    search: Record<string, unknown>,
  ): { spot?: string; date?: string } => ({
    spot: typeof search.spot === 'string' ? search.spot : undefined,
    date:
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined,
  }),
  component: MapPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/dashboard',
  beforeLoad: requireNonGuest,
  component: DashboardPage,
})

const ownersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/owners',
  beforeLoad: requireNonGuest,
  component: OwnersPage,
})

const statsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stats',
  beforeLoad: requireNonGuest,
  component: StatsPage,
})

const myBookingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/my-bookings',
  beforeLoad: requireNonGuest,
  component: MyBookingsPage,
})

const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin',
  beforeLoad: requireNonGuest,
  component: AdminPage,
})

const adminFeedbackRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin/feedback',
  beforeLoad: requireNonGuest,
  component: AdminFeedbackPage,
})

const mapEditorRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/map-editor',
  beforeLoad: requireNonGuest,
  component: MapEditorPage,
})

const ownerParkingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/my-parking',
  beforeLoad: requireNonGuest,
  component: OwnerParkingPage,
})

const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/profile',
  beforeLoad: requireNonGuest,
  component: ProfilePage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  callbackRoute,
  mapLayoutRoute.addChildren([mapRoute]),
  layoutRoute.addChildren([
    dashboardRoute,
    ownersRoute,
    statsRoute,
    myBookingsRoute,
    ownerParkingRoute,
    adminRoute,
    adminFeedbackRoute,
    mapEditorRoute,
    profileRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
