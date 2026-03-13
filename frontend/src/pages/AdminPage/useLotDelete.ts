import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useDeleteLot } from '@/hooks/useLots'
import type { ParkingLot } from '@/types'

// — hook —

export function useLotDelete() {
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null)
  const deleteLot = useDeleteLot()

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteLot.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: `"${deleteTarget.name}" deleted`,
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Failed to delete lot',
          color: 'red',
        }),
    })
  }

  return {
    deleteTarget,
    setDeleteTarget,
    isDeleting: deleteLot.isPending,
    handleConfirmDelete,
  }
}
