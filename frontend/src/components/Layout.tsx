import { Drawer } from '@mantine/core'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart2,
  Calendar,
  ChevronDown,
  EllipsisVertical,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Map,
  MessageSquare,
  ParkingCircle,
  PenLine,
  Settings,
  SquareParking,
  User,
  Users,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpFeedbackDialog } from '@/components/HelpFeedbackDialog'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

interface LayoutProps {
  children: ReactNode
  noPadding?: boolean
}

export function Layout({ children, noPadding }: LayoutProps) {
  const { t } = useTranslation()
  useRealtimeSync()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const topNavItems = [
    { to: '/', label: t('nav.map'), shortLabel: t('nav.map'), Icon: Map },
    {
      to: '/dashboard',
      label: t('nav.dashboard'),
      shortLabel: t('nav.dashboardShort'),
      Icon: LayoutDashboard,
    },
    {
      to: '/stats',
      label: t('nav.statistics'),
      shortLabel: t('nav.statistics'),
      Icon: BarChart2,
    },
    {
      to: '/my-bookings',
      label: t('nav.myBookings'),
      shortLabel: t('nav.myBookingsShort'),
      Icon: Calendar,
    },
    {
      to: '/my-parking',
      label: t('nav.myParking'),
      shortLabel: t('nav.myParkingShort'),
      Icon: SquareParking,
    },
  ]

  const adminSubItems = [
    { to: '/admin', label: t('nav.adminParking'), Icon: ParkingCircle },
    { to: '/owners', label: t('nav.adminOwners'), Icon: Users },
    { to: '/map-editor', label: t('nav.adminMapEditor'), Icon: PenLine },
    {
      to: '/admin/feedback',
      label: t('nav.adminFeedback'),
      Icon: MessageSquare,
    },
  ]

  const isAdminSection =
    pathname === '/admin' ||
    pathname === '/owners' ||
    pathname === '/map-editor' ||
    pathname === '/admin/feedback'
  const [adminOpen, setAdminOpen] = useState(isAdminSection)
  const [helpOpen, setHelpOpen] = useState(false)
  const moreOpen = useUIStore((s) => s.moreDrawerOpen)
  const setMoreOpen = useUIStore((s) => s.setMoreDrawerOpen)

  // Close the "More" drawer when the viewport grows past the sm breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setMoreOpen(false)
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  function isActive(to: string, exact = false) {
    return exact ? pathname === to : pathname.startsWith(to)
  }

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
    'relative text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors'
  const activeLinkClass =
    'bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary before:absolute before:inset-y-1.5 before:left-0.5 before:w-0.5 before:rounded-full before:bg-primary'

  return (
    <div className="flex h-screen overflow-hidden">
      {sessionExpired && (
        <div className="bg-background/70 fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-sm font-medium">{t('auth.sessionExpired')}</p>
        </div>
      )}
      {/* Sidebar — desktop only */}
      <aside className="bg-card hidden w-56 shrink-0 flex-col border-r sm:flex">
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4">
          <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg">
            <ParkingCircle className="text-primary size-4" />
          </div>
          <span className="ml-2.5 text-sm font-semibold tracking-tight">
            ParkFlow
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
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
              <span>{label}</span>
            </Link>
          ))}

          {/* Admin dropdown — only visible to admins */}
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => setAdminOpen((o) => !o)}
                title={t('nav.admin')}
                className={`${linkClass} w-full cursor-pointer ${isAdminSection ? activeLinkClass : ''}`}
              >
                <Settings className="size-4 shrink-0" />
                <span className="flex-1 text-left text-sm">
                  {t('nav.admin')}
                </span>
                <ChevronDown
                  className={`size-3.5 shrink-0 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {adminOpen && (
                <div className="ml-3 flex flex-col gap-0.5">
                  {adminSubItems.map(({ to, label, Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      title={label}
                      className={`${linkClass} pl-4`}
                      activeProps={{ className: activeLinkClass }}
                      activeOptions={{ exact: true }}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Bottom — user info + logout / login */}
        <div className="border-t p-3">
          {user ? (
            <div className="space-y-2">
              <Link
                to="/profile"
                className="hover:bg-muted -mx-1 rounded-md px-1 py-1"
                title={t('nav.profile')}
              >
                <p className="text-xs font-medium">{user.displayName}</p>
                <p className="text-muted-foreground text-xs">{user.username}</p>
              </Link>
              <div
                className="flex items-center justify-between"
                title={`${user.displayName} (${user.username})`}
              >
                <ThemeToggle />
                <LanguageSwitcher />
                <button
                  onClick={() => setHelpOpen(true)}
                  title={t('feedback.helpAndFeedback')}
                  className="bg-muted text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-colors"
                  style={{ fontSize: 11 }}
                >
                  <HelpCircle className="size-3" />
                  {t('feedback.help')}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label={t('auth.logOut')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link
                to="/login"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <LogIn className="size-4 shrink-0" />
                <span>{t('nav.signIn')}</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      {noPadding ? (
        <main className="flex-1 overflow-hidden">{children}</main>
      ) : (
        <main className="bg-muted/40 flex-1 overflow-y-auto p-4 pb-20 sm:p-6 sm:pb-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      )}

      {/* Bottom navigation — mobile only */}
      <nav className="bg-card fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t sm:hidden">
        {topNavItems.map(({ to, shortLabel, Icon }) => {
          const active = isActive(to, to === '/')
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors ${
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5 shrink-0" />
              <span className="w-full truncate text-center text-[9px] leading-tight">
                {shortLabel}
              </span>
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 px-0.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors ${
            isAdminSection || moreOpen
              ? 'text-primary font-semibold'
              : 'text-muted-foreground'
          }`}
        >
          <EllipsisVertical className="size-5 shrink-0" />
          <span className="text-[9px] leading-tight">{t('nav.more')}</span>
        </button>
      </nav>

      {/* "More" drawer — mobile only */}
      <Drawer
        opened={moreOpen}
        onClose={() => setMoreOpen(false)}
        position="bottom"
        size="auto"
        withCloseButton={false}
        padding="sm"
        radius="md"
        classNames={{ body: 'pb-[max(1rem,env(safe-area-inset-bottom))]' }}
      >
        <div className="space-y-1">
          {/* Close handle + button */}
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="bg-border mx-auto h-1 w-8 rounded-full" />
            <button
              onClick={() => setMoreOpen(false)}
              className="text-muted-foreground hover:text-foreground absolute top-3 right-4 flex size-8 items-center justify-center rounded-lg transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          {/* Admin sub-nav (admins only) */}
          {user?.role === 'admin' && (
            <>
              <p className="text-muted-foreground px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                {t('nav.admin')}
              </p>
              {adminSubItems.map(({ to, label, Icon }) => {
                const active = isActive(to, true)
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Link>
                )
              })}
              <div className="bg-border my-2 h-px" />
            </>
          )}

          {/* Profile link */}
          {user && (
            <Link
              to="/profile"
              onClick={() => setMoreOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive('/profile', true)
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <User className="size-4 shrink-0" />
              {t('nav.profile')}
            </Link>
          )}

          {/* Utility row */}
          <div className="flex items-center gap-1 px-2 py-2">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <button
              onClick={() => {
                setMoreOpen(false)
                setHelpOpen(true)
              }}
              className="bg-muted text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 transition-colors"
              style={{ fontSize: 12 }}
            >
              <HelpCircle className="size-3.5" />
              {t('feedback.help')}
            </button>
            <div className="flex-1" />
            {user ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label={t('auth.logOut')}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
              </Button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMoreOpen(false)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <LogIn className="size-4 shrink-0" />
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </Drawer>

      <HelpFeedbackDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
