import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Spot } from '@/types'

// — types —

interface SpotDeleteDialogProps {
  readonly target: Spot | null
  readonly isDeleting: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

// — main component —

export function SpotDeleteDialog({
  target,
  isDeleting,
  onConfirm,
  onCancel,
}: SpotDeleteDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.deleteSpotTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t('admin.deleteSpotConfirm', { number: target?.number })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('admin.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {t('admin.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
