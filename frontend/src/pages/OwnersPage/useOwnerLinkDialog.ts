import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLinkOwner } from '@/hooks/useOwners'
import type { Owner } from '@/types'

export function useOwnerLinkDialog(owners: Owner[]) {
  const { t } = useTranslation()
  const linkOwner = useLinkOwner()

  const [linkTargetId, setLinkTargetId] = useState<string | null>(null)
  const [linkUsername, setLinkUsername] = useState('')

  const linkTarget = owners.find((o) => o.id === linkTargetId)

  function openLink(owner: Owner) {
    setLinkTargetId(owner.id)
    setLinkUsername(owner.user_id ?? '')
  }

  function handleLink() {
    if (!linkTargetId) return
    const targetName = linkTarget?.name
    const username = linkUsername.trim() || null
    linkOwner.mutate(
      { id: linkTargetId, username },
      {
        onSuccess: () => {
          notifications.show({
            message: username
              ? t('owners.ownerLinked', {
                  name: targetName,
                  username,
                })
              : t('owners.ownerUnlinked', { name: targetName }),
            color: 'green',
          })
          setLinkTargetId(null)
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : t('owners.failedToLink'),
            color: 'red',
          }),
      },
    )
  }

  function closeLink() {
    setLinkTargetId(null)
  }

  return {
    linkTarget,
    isLinkDialogOpen: linkTargetId !== null,
    linkUsername,
    setLinkUsername,
    isLinking: linkOwner.isPending,
    openLink,
    handleLink,
    closeLink,
  }
}
