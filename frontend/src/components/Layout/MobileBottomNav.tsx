import { Link } from '@tanstack/react-router'
import { EllipsisVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/store/authStore'

import { getNavItems, isActivePath, isAdminSection } from './constants'

// — types —

interface MobileBottomNavProps {
  readonly pathname: string
  readonly isMoreOpen: boolean
  readonly onMoreOpen: () => void
}

// — main component —

export function MobileBottomNav({
  pathname,
  isMoreOpen,
  onMoreOpen,
}: MobileBottomNavProps) {
  const { t } = useTranslation()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = isAdminSection(pathname)
  const navItems = getNavItems(role)

  return (
    <nav className="bg-card fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t sm:hidden">
      {navItems.map(({ to, shortLabelKey, Icon }) => {
        const active = isActivePath(pathname, to, to === '/')
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
              {t(shortLabelKey)}
            </span>
          </Link>
        )
      })}
      <button
        onClick={onMoreOpen}
        className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 px-0.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors ${
          isAdmin || isMoreOpen
            ? 'text-primary font-semibold'
            : 'text-muted-foreground'
        }`}
      >
        <EllipsisVertical className="size-5 shrink-0" />
        <span className="text-[9px] leading-tight">{t('nav.more')}</span>
      </button>
    </nav>
  )
}
