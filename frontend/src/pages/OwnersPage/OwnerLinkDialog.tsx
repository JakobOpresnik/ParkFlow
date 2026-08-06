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

  // One owner per spot, so one username field.
  const suggestion = (ownerName ?? '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('owners.linkSsoTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t('owners.linkSsoDesc', { name: ownerName })}
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {ownerName}
            </label>
            <Input
              placeholder={`e.g. ${suggestion}`}
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
            />
          </div>
          <p className="text-muted-foreground text-xs">
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
