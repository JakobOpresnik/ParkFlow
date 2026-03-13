import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useUpdateStatus } from '@/hooks/useSpots'
import type { Spot, SpotStatus } from '@/types'

import { STATUS_CONFIG } from './constants'

// — hook —

export function useManagementAccordion(spot: Spot) {
  const [expanded, setExpanded] = useState<boolean>(false)
  const updateStatus = useUpdateStatus()

  function handleStatusChange(status: SpotStatus) {
    updateStatus.mutate(
      { id: spot.id, status },
      {
        onSuccess: () =>
          notifications.show({
            message: `Spot #${spot.number} marked as ${STATUS_CONFIG[status].label}`,
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to update status',
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
