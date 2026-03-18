import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('owners.linkSsoTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t('owners.linkSsoDesc', { name: ownerName })}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t('owners.ssoUsernameLabel')}
          </label>
          <Input
            placeholder="e.g. jnovak"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {t('owners.leaveEmptyToUnlink')}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('owners.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {username.trim() ? t('owners.link') : t('owners.unlink')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
