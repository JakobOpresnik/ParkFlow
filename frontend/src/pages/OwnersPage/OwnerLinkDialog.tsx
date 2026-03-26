import { useMemo } from 'react'
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

/**
 * Split the owner name by "/" to get individual co-owner names.
 * e.g. "Iztok Kavkler / Jan Grošelj" → ["Iztok Kavkler", "Jan Grošelj"]
 */
function getOwnerNames(ownerName: string | undefined): string[] {
  if (!ownerName) return ['']
  const names = ownerName
    .split('/')
    .map((n) => n.trim())
    .filter(Boolean)
  return names.length > 0 ? names : ['']
}

/**
 * Split the comma-separated user_id into individual usernames,
 * padded to match the number of owner names.
 */
function splitUsernames(csv: string, count: number): string[] {
  const parts = csv.split(',').map((u) => u.trim())
  return Array.from({ length: count }, (_, i) => parts[i] ?? '')
}

/** Join individual usernames back into the comma-separated format. */
function joinUsernames(usernames: string[]): string {
  return usernames.map((u) => u.trim()).join(',')
}

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

  const ownerNames = useMemo(() => getOwnerNames(ownerName), [ownerName])
  const usernames = useMemo(
    () => splitUsernames(username, ownerNames.length),
    [username, ownerNames.length],
  )
  const hasAnyUsername = usernames.some((u) => u.trim() !== '')

  function handleChange(index: number, value: string) {
    const updated = [...usernames]
    updated[index] = value
    onUsernameChange(joinUsernames(updated))
  }

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
          {ownerNames.map((name, i) => (
            <div key={i}>
              <label className="mb-1 block text-sm font-medium">{name}</label>
              <Input
                placeholder={`e.g. ${name
                  .toLowerCase()
                  .replace(/\s+/g, '.')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')}`}
                value={usernames[i]}
                onChange={(e) => handleChange(i, e.target.value)}
              />
            </div>
          ))}
          <p className="text-muted-foreground text-xs">
            {t('owners.leaveEmptyToUnlink')}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('owners.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {hasAnyUsername ? t('owners.link') : t('owners.unlink')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
