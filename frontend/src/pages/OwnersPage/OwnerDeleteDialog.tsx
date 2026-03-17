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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Owner</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Remove <strong>{ownerName}</strong>? Their parking spots will be
          unassigned.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
