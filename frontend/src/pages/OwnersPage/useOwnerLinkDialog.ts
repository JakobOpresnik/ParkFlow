import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useLinkOwner } from '@/hooks/useOwners'
import type { Owner } from '@/types'

export function useOwnerLinkDialog(owners: Owner[]) {
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
              ? `${targetName} linked to ${username}`
              : `${targetName} unlinked`,
            color: 'green',
          })
          setLinkTargetId(null)
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to link owner',
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
