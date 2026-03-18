import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUpdateStatus } from '@/hooks/useSpots'
import type { Spot, SpotStatus } from '@/types'

// — hook —

export function useManagementAccordion(spot: Spot) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<boolean>(false)
  const updateStatus = useUpdateStatus()

  const STATUS_LABELS: Record<SpotStatus, string> = {
    free: t('spotModal.available'),
    occupied: t('spotModal.occupied'),
    reserved: t('spotModal.reservedStatus'),
  }

  function handleStatusChange(status: SpotStatus) {
    updateStatus.mutate(
      { id: spot.id, status },
      {
        onSuccess: () =>
          notifications.show({
            message: t('spotModal.toastStatusUpdated', {
              number: spot.number,
              status: STATUS_LABELS[status],
            }),
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error
                ? err.message
                : t('spotModal.toastStatusFailed'),
            color: 'red',
          }),
      },
    )
  }

  return {
    expanded,
    setExpanded,
    isPending: updateStatus.isPending,
    handleStatusChange,
  }
}
