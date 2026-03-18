import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { OwnerDeleteDialogProps } from './types'

export function OwnerDeleteDialog({
  ownerName,
  isOpen,
  isPending,
  onConfirm,
  onClose,
}: OwnerDeleteDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('owners.deleteOwnerTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t('owners.deleteOwnerConfirm', { name: ownerName })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('owners.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {t('owners.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
