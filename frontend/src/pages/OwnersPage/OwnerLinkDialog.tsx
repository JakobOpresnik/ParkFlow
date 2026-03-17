import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import type { OwnerLinkDialogProps } from './types'

export function OwnerLinkDialog({
  ownerName,
  isOpen,
  isPending,
  username,
  onUsernameChange,
  onConfirm,
  onClose,
}: OwnerLinkDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Link SSO User</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Link <strong>{ownerName}</strong> to an SSO username so they can
          access the &quot;My Parking&quot; page.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium">SSO Username</label>
          <Input
            placeholder="e.g. jnovak"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Leave empty to unlink.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {username.trim() ? 'Link' : 'Unlink'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
