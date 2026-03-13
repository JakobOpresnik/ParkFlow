import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useDeleteSpot } from '@/hooks/useSpots'
import type { Spot } from '@/types'

// — hook —

export function useSpotDelete() {
  const [deleteTarget, setDeleteTarget] = useState<Spot | null>(null)
  const deleteSpot = useDeleteSpot()

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteSpot.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: `Spot #${deleteTarget.number} deleted`,
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Failed to delete spot',
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
