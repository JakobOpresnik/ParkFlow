import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useOwners } from '@/hooks/useOwners'
import { useAssignOwner } from '@/hooks/useSpots'
import type { Spot } from '@/types'

// — hook —

export function useOwnerAssignment(spot: Spot) {
  const { t } = useTranslation()
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
            message: t('spotModal.toastSpotUnassigned', {
              number: spot.number,
            }),
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error
                ? err.message
                : t('spotModal.toastAssignFailed'),
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
              ? t('spotModal.toastOwnerAssigned', { number: spot.number })
              : t('spotModal.toastSpotUnassigned', { number: spot.number }),
            color: 'green',
          })
          setAssignOpen(false)
          setSelectedOwnerId(null)
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error
                ? err.message
                : t('spotModal.toastAssignOwnerFailed'),
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
