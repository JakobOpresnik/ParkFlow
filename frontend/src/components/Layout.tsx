import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart2,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Map,
  ParkingCircle,
  PenLine,
  Settings,
  SquareParking,
  User,
  Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

const topNavItems = [
  { to: '/', label: 'Map', Icon: Map },
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/stats', label: 'Statistics', Icon: BarChart2 },
  { to: '/my-bookings', label: 'My Bookings', Icon: Calendar },
  { to: '/my-parking', label: 'My Parking', Icon: SquareParking },
]

const adminSubItems = [
  { to: '/admin', label: 'Parking', Icon: ParkingCircle },
  { to: '/owners', label: 'Owners', Icon: Users },
  { to: '/map-editor', label: 'Map Editor', Icon: PenLine },
]

interface LayoutProps {
  children: ReactNode
  noPadding?: boolean
}

export function Layout({ children, noPadding }: LayoutProps) {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isAdminSection =
    pathname === '/admin' ||
    pathname === '/owners' ||
    pathname === '/map-editor'
  const [adminOpen, setAdminOpen] = useState(isAdminSection)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  }

  function handleLogout() {
    logout()
  }

  const linkClass =
    'relative text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors sm:px-3'
  const activeLinkClass =
    'bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary before:absolute before:inset-y-1.5 before:left-0.5 before:w-0.5 before:rounded-full before:bg-primary'

  return (
    <div className="flex h-screen overflow-hidden">
      {sessionExpired && (
        <div className="bg-background/70 fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-sm font-medium">
            Seja je potekla — preusmerjanje na ponovno prijavo…
          </p>
        </div>
      )}
      {/* Sidebar */}
      <aside className="bg-card flex w-14 shrink-0 flex-col border-r sm:w-56">
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-3 sm:px-4">
          <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg">
            <ParkingCircle className="text-primary size-4" />
          </div>
          <span className="ml-2.5 hidden text-sm font-semibold tracking-tight sm:block">
            ParkFlow
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 sm:p-3">
          {topNavItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className={linkClass}
              activeProps={{ className: activeLinkClass }}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}

          {/* Admin dropdown */}
          <button
            onClick={() => setAdminOpen((o) => !o)}
            title="Admin"
            className={`${linkClass} w-full cursor-pointer ${isAdminSection ? activeLinkClass : ''}`}
          >
            <Settings className="size-4 shrink-0" />
            <span className="hidden flex-1 text-left sm:block">Admin</span>
            {/* Mobile: dot indicator when section active */}
            {isAdminSection && (
              <span className="bg-primary ml-auto size-1.5 shrink-0 rounded-full sm:hidden" />
            )}
            <ChevronDown
              className={`hidden size-3.5 shrink-0 transition-transform sm:block ${adminOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {adminOpen && (
            <div className="ml-2 flex flex-col gap-0.5 sm:ml-3">
              {adminSubItems.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`${linkClass} sm:pl-4`}
                  activeProps={{ className: activeLinkClass }}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom — user info + logout / login */}
        <div className="border-t p-2 sm:p-3">
          {user ? (
            <div className="space-y-2">
              <Link
                to="/profile"
                className="hover:bg-muted -mx-1 hidden rounded-md px-1 py-1 sm:block"
                title="View profile"
              >
                <p className="text-xs font-medium">{user.displayName}</p>
                <p className="text-muted-foreground text-xs">{user.username}</p>
              </Link>
              <div
                className="flex items-center justify-between"
                title={`${user.displayName} (${user.username})`}
              >
                <Link
                  to="/profile"
                  className="text-muted-foreground hover:bg-muted flex size-8 items-center justify-center rounded-md transition-colors sm:hidden"
                  title="Profile"
                >
                  <User className="size-4" />
                </Link>
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                to="/login"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <LogIn className="size-4 shrink-0" />
                <span className="hidden sm:block">Sign in</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      {noPadding ? (
        <main className="flex-1 overflow-hidden">{children}</main>
      ) : (
        <main className="bg-muted/40 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      )}
    </div>
  )
}
