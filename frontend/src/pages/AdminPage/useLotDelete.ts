import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeleteLot } from '@/hooks/useLots'
import type { ParkingLot } from '@/types'

// — hook —

export function useLotDelete() {
  const { t } = useTranslation()
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null)
  const deleteLot = useDeleteLot()

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteLot.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: t('admin.lotDeleted', { name: deleteTarget.name }),
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : t('admin.failedToDeleteLot'),
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
