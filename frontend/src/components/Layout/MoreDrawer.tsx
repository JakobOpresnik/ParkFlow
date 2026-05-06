import { Drawer } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { HelpCircle, LogIn, LogOut, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import type { AppUser } from '@/types'

import { ADMIN_ITEMS, isActivePath } from './constants'

// — types —

interface MoreDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly user: AppUser | null
  readonly pathname: string
  readonly onLogout: () => void
  readonly onHelpOpen: () => void
}

// — main component —

export function MoreDrawer({
  isOpen,
  onClose,
  user,
  pathname,
  onLogout,
  onHelpOpen,
}: MoreDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
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
            onClick={onClose}
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
            {ADMIN_ITEMS.map(({ to, labelKey, Icon }) => {
              const active = isActivePath(pathname, to, true)
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {t(labelKey)}
                </Link>
              )
            })}
            <div className="bg-border my-2 h-px" />
          </>
        )}

        {/* Profile link (signed-in users only — guests have no profile) */}
        {user && user.role !== 'guest' && (
          <Link
            to="/profile"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActivePath(pathname, '/profile', true)
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <User className="size-4 shrink-0" />
            {t('nav.profile')}
          </Link>
        )}

        {user?.role === 'guest' && (
          <div className="px-3 py-2">
            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {t('auth.guestMode')}
            </span>
          </div>
        )}

        {/* Utility row */}
        <div className="flex items-center gap-1 px-2 py-2">
          <ThemeToggle />
          <LanguageSwitcher compact />
          {user && user.role !== 'guest' && (
            <button
              onClick={() => {
                onClose()
                onHelpOpen()
              }}
              className="bg-muted text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 transition-colors"
              style={{ fontSize: 12 }}
            >
              <HelpCircle className="size-3.5" />
              {t('feedback.help')}
            </button>
          )}
          <div className="flex-1" />
          {user && user.role !== 'guest' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              aria-label={t('auth.logOut')}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          ) : user?.role === 'guest' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground gap-1.5 px-2"
            >
              <LogIn className="size-3.5" />
              <span className="text-xs">{t('nav.signIn')}</span>
            </Button>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
              <LogIn className="size-4 shrink-0" />
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>
    </Drawer>
  )
}
