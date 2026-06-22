import { useRouterState } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AboutModal } from '@/components/AboutModal'
import { HelpFeedbackDialog } from '@/components/HelpFeedbackDialog'
import { ReminderOnboardingModal } from '@/components/ReminderOnboardingModal'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

import { ActiveBookingBar } from './ActiveBookingBar'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileHeader } from './MobileHeader'
import { MoreDrawer } from './MoreDrawer'

// — types —

interface LayoutProps {
  readonly children: ReactNode
  readonly noPadding?: boolean
}

// — main component —

export function Layout({ children, noPadding }: LayoutProps) {
  const { t } = useTranslation()
  useRealtimeSync()

  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const moreOpen = useUIStore((s) => s.moreDrawerOpen)
  const setMoreOpen = useUIStore((s) => s.setMoreDrawerOpen)

  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  // Close the "More" drawer when the viewport grows past the sm breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setMoreOpen(false)
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [setMoreOpen])

  // Keyboard shortcut: press 'i' to toggle the About modal
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'i' && e.key !== 'I') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return
        }
      }
      e.preventDefault()
      setAboutOpen((prev) => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sessionExpired && (
        <div className="bg-background/70 fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-sm font-medium">{t('auth.sessionExpired')}</p>
        </div>
      )}

      <DesktopSidebar
        user={user}
        pathname={pathname}
        onLogout={logout}
        onHelpOpen={() => setHelpOpen(true)}
        onAboutOpen={() => setAboutOpen(true)}
      />

      {/* Main column: mobile top bar (sm:hidden) above the content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <ActiveBookingBar />
        {noPadding ? (
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        ) : (
          <main className="bg-muted/40 min-h-0 flex-1 overflow-y-auto p-4 pb-20 sm:p-6 sm:pb-6">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        )}
      </div>

      <MobileBottomNav
        pathname={pathname}
        isMoreOpen={moreOpen}
        onMoreOpen={() => setMoreOpen(true)}
      />

      <MoreDrawer
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        user={user}
        pathname={pathname}
        onLogout={logout}
        onHelpOpen={() => setHelpOpen(true)}
      />

      <HelpFeedbackDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />

      <ReminderOnboardingModal />
    </div>
  )
}
