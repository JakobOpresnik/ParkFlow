import { Link, useNavigate } from '@tanstack/react-router'
import {
  Map,
  Users,
  ParkingCircle,
  BarChart2,
  Calendar,
  LogIn,
  LogOut,
  Settings,
  PenLine,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Map', Icon: Map },
  { to: '/owners', label: 'Owners', Icon: Users },
  { to: '/stats', label: 'Statistics', Icon: BarChart2 },
  { to: '/my-bookings', label: 'My Bookings', Icon: Calendar },
  { to: '/admin', label: 'Admin', Icon: Settings },
  { to: '/map-editor', label: 'Map Editor', Icon: PenLine },
]

interface LayoutProps {
  children: ReactNode
  noPadding?: boolean
}

export function Layout({ children, noPadding }: LayoutProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    void navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="bg-card flex w-14 shrink-0 flex-col border-r sm:w-56">
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-3 sm:px-4">
          <ParkingCircle className="text-primary size-5 shrink-0" />
          <span className="ml-2 hidden text-sm font-semibold tracking-tight sm:block">
            ParkFlow
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 sm:p-3">
          {navItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-md px-2 py-2.5 text-sm transition-colors sm:px-3"
              activeProps={{
                className:
                  'bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary',
              }}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom — user info + logout / login */}
        <div className="border-t p-2 sm:p-3">
          {user ? (
            <div className="space-y-2">
              <div className="hidden sm:block">
                <p className="text-xs font-medium">{user.displayName}</p>
                <p className="text-muted-foreground text-xs">{user.username}</p>
              </div>
              <div className="flex items-center gap-2">
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
