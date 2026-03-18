import { ArrowRight, CalendarDays } from 'lucide-react'
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

// — types —

interface NextWeekPromptProps {
  readonly isOpen: boolean
  readonly onGoToNextWeek: () => void
  readonly onDismiss: () => void
}

// — main component —

export function NextWeekPrompt({
  isOpen,
  onGoToNextWeek,
  onDismiss,
}: NextWeekPromptProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="gap-5">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="text-primary size-5 shrink-0" />
            {t('map.switchToNextWeek')}
          </DialogTitle>
          <DialogDescription>{t('map.nextWeekDesc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-3">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            {t('map.stay')}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onGoToNextWeek}>
            {t('map.goToNextWeek')}
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
