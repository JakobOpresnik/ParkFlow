import { Link } from '@tanstack/react-router'
import {
  ChevronDown,
  HelpCircle,
  LogIn,
  LogOut,
  ParkingCircle,
  Settings,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import type { AppUser } from '@/types'

import {
  ACTIVE_LINK_CLASS,
  ADMIN_ITEMS,
  isAdminSection,
  LINK_CLASS,
  NAV_ITEMS,
} from './constants'

// — types —

interface DesktopSidebarProps {
  readonly user: AppUser | null
  readonly pathname: string
  readonly onLogout: () => void
  readonly onHelpOpen: () => void
}

// — main component —

export function DesktopSidebar({
  user,
  pathname,
  onLogout,
  onHelpOpen,
}: DesktopSidebarProps) {
  const { t } = useTranslation()
  const isAdmin = isAdminSection(pathname)
  const [adminOpen, setAdminOpen] = useState(isAdmin)

  return (
    <aside className="bg-card hidden w-56 shrink-0 flex-col border-r sm:flex">
      {/* Logo */}
      <div className="flex h-14 cursor-pointer items-center border-b px-4">
        <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg">
          <ParkingCircle className="text-primary size-4" />
        </div>
        <span className="ml-2.5 text-sm font-semibold tracking-tight">
          ParkFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <Link
            key={to}
            to={to}
            title={t(labelKey)}
            className={LINK_CLASS}
            activeProps={{ className: ACTIVE_LINK_CLASS }}
            activeOptions={{ exact: to === '/' }}
          >
            <Icon className="size-4 shrink-0" />
            <span>{t(labelKey)}</span>
          </Link>
        ))}

        {/* Admin dropdown */}
        {user?.role === 'admin' && (
          <>
            <button
              onClick={() => setAdminOpen((o) => !o)}
              title={t('nav.admin')}
              className={`${LINK_CLASS} w-full cursor-pointer ${isAdmin ? ACTIVE_LINK_CLASS : ''}`}
            >
              <Settings className="size-4 shrink-0" />
              <span className="flex-1 text-left text-sm">{t('nav.admin')}</span>
              <ChevronDown
                className={`size-3.5 shrink-0 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {adminOpen && (
              <div className="ml-3 flex flex-col gap-0.5">
                {ADMIN_ITEMS.map(({ to, labelKey, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    title={t(labelKey)}
                    className={`${LINK_CLASS} pl-4`}
                    activeProps={{ className: ACTIVE_LINK_CLASS }}
                    activeOptions={{ exact: true }}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{t(labelKey)}</span>
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
              className="hover:bg-muted rounded-md px-2 py-0.5"
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
                onClick={onHelpOpen}
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
                onClick={onLogout}
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
  )
}
