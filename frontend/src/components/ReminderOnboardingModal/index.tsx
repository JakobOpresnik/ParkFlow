import { useNavigate } from '@tanstack/react-router'
import { BellRing } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/authStore'
import { useOnboardingStore } from '@/store/onboardingStore'

// — constants —

const ONBOARDING_KEY = 'reminders_v1'

// — main component —

/**
 * One-time announcement shown on the first authenticated session after the
 * morning-reminder feature shipped. Reminders are on by default, so this points
 * users to where they can manage or turn them off. Dismissal is remembered in
 * localStorage keyed by user id (see onboardingStore), so it shows once per
 * user per browser.
 */
export function ReminderOnboardingModal() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const seen = useOnboardingStore((s) => s.seen)
  const markSeen = useOnboardingStore((s) => s.markSeen)

  // Guests can't receive reminders (backend `requireNonGuest`), so skip them.
  const shouldShow =
    !!user && user.role !== 'guest' && seen[user.id]?.[ONBOARDING_KEY] !== true

  const dismiss = () => {
    if (user) markSeen(user.id, ONBOARDING_KEY)
  }

  const goToProfile = () => {
    if (user) markSeen(user.id, ONBOARDING_KEY)
    void navigate({ to: '/profile' })
  }

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="gap-5">
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="text-primary size-5 shrink-0" />
            {t('onboarding.reminders.title')}
          </DialogTitle>
          <DialogDescription>
            {t('onboarding.reminders.body')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-3">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            {t('onboarding.reminders.dismiss')}
          </Button>
          <Button size="sm" onClick={goToProfile}>
            {t('onboarding.reminders.manage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
