// Route tree — update this file when adding new routes via /add-route
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { MapPage } from '@/pages/MapPage'
import { OwnersPage } from '@/pages/OwnersPage'
import { StatsPage } from '@/pages/StatsPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { CallbackPage } from '@/pages/CallbackPage'
import { AdminPage } from '@/pages/AdminPage'
import { MapEditorPage } from '@/pages/MapEditorPage'
import { Layout } from '@/components/Layout'

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

const routeTree = rootRoute.addChildren([
  loginRoute,
  callbackRoute,
  mapLayoutRoute.addChildren([mapRoute]),
  layoutRoute.addChildren([
    ownersRoute,
    statsRoute,
    myBookingsRoute,
    adminRoute,
    mapEditorRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
