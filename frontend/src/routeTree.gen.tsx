// Route tree — update this file when adding new routes via /add-route
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { MapPage } from '@/pages/MapPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { OwnersPage } from '@/pages/OwnersPage'
import { StatsPage } from '@/pages/StatsPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { CallbackPage } from '@/pages/CallbackPage'
import { AdminPage } from '@/pages/AdminPage'
import { MapEditorPage } from '@/pages/MapEditorPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { Layout } from '@/components/Layout'
import { useAuthStore, authInitPromise } from '@/store/authStore'

async function requireAuth() {
  await authInitPromise
  const { user } = useAuthStore.getState()
  if (!user) throw redirect({ to: '/login' })
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
  component: MapPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const ownersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/owners',
  component: OwnersPage,
})

const statsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/stats',
  component: StatsPage,
})

const myBookingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/my-bookings',
  component: MyBookingsPage,
})

const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin',
  component: AdminPage,
})

const mapEditorRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/map-editor',
  component: MapEditorPage,
})

const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/profile',
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
    adminRoute,
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
