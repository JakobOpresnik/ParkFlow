import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeleteSpot } from '@/hooks/useSpots'
import type { Spot } from '@/types'

// — hook —

export function useSpotDelete() {
  const { t } = useTranslation()
  const [deleteTarget, setDeleteTarget] = useState<Spot | null>(null)
  const deleteSpot = useDeleteSpot()

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteSpot.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: t('admin.spotDeleted', { number: deleteTarget.number }),
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : t('admin.failedToDeleteSpot'),
          color: 'red',
        }),
    })
  }

  return {
    deleteTarget,
    setDeleteTarget,
    isDeleting: deleteSpot.isPending,
    handleConfirmDelete,
  }
}
