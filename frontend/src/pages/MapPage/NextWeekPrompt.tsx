import { ArrowRight, CalendarDays } from 'lucide-react'

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
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="gap-5">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="text-primary size-5 shrink-0" />
            Switch to next week?
          </DialogTitle>
          <DialogDescription>
            This week&apos;s reservation window has closed. Would you like to
            view next week&apos;s availability and reserve a spot in advance?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-3">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Stay
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onGoToNextWeek}>
            Go to next week
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
