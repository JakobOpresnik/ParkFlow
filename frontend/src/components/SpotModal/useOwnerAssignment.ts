import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useOwners } from '@/hooks/useOwners'
import { useAssignOwner } from '@/hooks/useSpots'
import type { Spot } from '@/types'

// — hook —

export function useOwnerAssignment(spot: Spot) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)

  const { data: owners = [] } = useOwners()
  const assignOwner = useAssignOwner()

  const ownerSelectData = owners.map((o) => ({
    value: o.id,
    label: o.name + (o.vehicle_plate ? ` (${o.vehicle_plate})` : ''),
  }))

  function handleUnassign() {
    assignOwner.mutate(
      { id: spot.id, owner_id: null },
      {
        onSuccess: () =>
          notifications.show({
            message: `Spot #${spot.number} unassigned`,
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message: err instanceof Error ? err.message : 'Failed',
            color: 'red',
          }),
      },
    )
  }

  function handleAssignConfirm() {
    if (!selectedOwnerId) return
    const ownerId = selectedOwnerId === '__unassign__' ? null : selectedOwnerId
    assignOwner.mutate(
      { id: spot.id, owner_id: ownerId },
      {
        onSuccess: () => {
          notifications.show({
            message: ownerId
              ? `Owner assigned to spot #${spot.number}`
              : `Spot #${spot.number} unassigned`,
            color: 'green',
          })
          setAssignOpen(false)
          setSelectedOwnerId(null)
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to assign owner',
            color: 'red',
          }),
      },
    )
  }

  return {
    assignOpen,
    setAssignOpen,
    selectedOwnerId,
    setSelectedOwnerId,
    owners,
    ownerSelectData,
    isPending: assignOwner.isPending,
    handleUnassign,
    handleAssignConfirm,
  }
}
