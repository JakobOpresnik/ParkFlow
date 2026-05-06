import type { LucideIcon } from 'lucide-react'
import {
  BarChart2,
  Calendar,
  LayoutDashboard,
  Map,
  MessageSquare,
  ParkingCircle,
  PenLine,
  SquareParking,
  Users,
} from 'lucide-react'

import type { Role } from '@/types'

// — types —

export interface NavItem {
  readonly to: string
  readonly labelKey: string
  readonly shortLabelKey: string
  readonly Icon: LucideIcon
}

export interface AdminItem {
  readonly to: string
  readonly labelKey: string
  readonly Icon: LucideIcon
}

// — constants —

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.map', shortLabelKey: 'nav.map', Icon: Map },
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    shortLabelKey: 'nav.dashboardShort',
    Icon: LayoutDashboard,
  },
  {
    to: '/stats',
    labelKey: 'nav.statistics',
    shortLabelKey: 'nav.statistics',
    Icon: BarChart2,
  },
  {
    to: '/my-bookings',
    labelKey: 'nav.myBookings',
    shortLabelKey: 'nav.myBookingsShort',
    Icon: Calendar,
  },
  {
    to: '/my-parking',
    labelKey: 'nav.myParking',
    shortLabelKey: 'nav.myParkingShort',
    Icon: SquareParking,
  },
]

export const ADMIN_ITEMS: AdminItem[] = [
  { to: '/admin', labelKey: 'nav.adminParking', Icon: ParkingCircle },
  { to: '/owners', labelKey: 'nav.adminOwners', Icon: Users },
  { to: '/map-editor', labelKey: 'nav.adminMapEditor', Icon: PenLine },
  { to: '/admin/feedback', labelKey: 'nav.adminFeedback', Icon: MessageSquare },
]

export const ADMIN_PATHS = ADMIN_ITEMS.map((i) => i.to)

// Guests can only see the live map. Everything else (dashboard, stats,
// bookings, owner views) is gated server-side too — this just keeps the nav
// honest.
export function getNavItems(role: Role | undefined): NavItem[] {
  if (role === 'guest') return NAV_ITEMS.filter((i) => i.to === '/')
  return NAV_ITEMS
}

export const LINK_CLASS =
  'relative text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors'

export const ACTIVE_LINK_CLASS =
  'bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary before:absolute before:inset-y-1.5 before:left-0.5 before:w-0.5 before:rounded-full before:bg-primary'

// — helpers —

export function isActivePath(
  pathname: string,
  to: string,
  exact = false,
): boolean {
  return exact ? pathname === to : pathname.startsWith(to)
}

export function isAdminSection(pathname: string): boolean {
  return ADMIN_PATHS.includes(pathname)
}
