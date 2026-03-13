import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useCreateOwner, useOwners } from '@/hooks/useOwners'
import { useAssignOwner, useUpdateStatus } from '@/hooks/useSpots'
import type { Spot, SpotStatus } from '@/types'

const STATUS_LABELS: Record<SpotStatus, string> = {
  free: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

export function useManagementAccordion(spot: Spot) {
  const [expanded, setExpanded] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlate, setNewPlate] = useState('')

  const { data: owners = [] } = useOwners()
  const assignOwner = useAssignOwner()
  const updateStatus = useUpdateStatus()
  const createOwner = useCreateOwner()
  const isPending =
    assignOwner.isPending || updateStatus.isPending || createOwner.isPending

  const ownerSelectData = owners.map((o) => ({
    value: o.id,
    label: o.name + (o.vehicle_plate ? ` (${o.vehicle_plate})` : ''),
  }))

  function handleStatusChange(status: SpotStatus) {
    updateStatus.mutate(
      { id: spot.id, status },
      {
        onSuccess: () =>
          notifications.show({
            message: `Spot #${spot.number} marked as ${STATUS_LABELS[status]}`,
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
          setCreateFormOpen(false)
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

  function handleCreateAndAssign() {
    if (!newName.trim()) return
    createOwner.mutate(
      {
        name: newName.trim(),
        email: null,
        phone: null,
        vehicle_plate: newPlate.trim() || null,
        notes: null,
      },
      {
        onSuccess: (owner) => {
          assignOwner.mutate(
            { id: spot.id, owner_id: owner.id },
            {
              onSuccess: () => {
                notifications.show({
                  message: `Owner "${owner.name}" created and assigned to spot #${spot.number}`,
                  color: 'green',
                })
                setExpanded(false)
                setAssignOpen(false)
                setSelectedOwnerId(null)
                setCreateFormOpen(false)
                setNewName('')
                setNewPlate('')
              },
              onError: (err) =>
                notifications.show({
                  message:
                    err instanceof Error ? err.message : 'Failed to assign',
                  color: 'red',
                }),
            },
          )
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to create owner',
            color: 'red',
          }),
      },
    )
  }

  return {
    expanded,
    setExpanded,
    assignOpen,
    setAssignOpen,
    selectedOwnerId,
    setSelectedOwnerId,
    createFormOpen,
    setCreateFormOpen,
    newName,
    setNewName,
    newPlate,
    setNewPlate,
    owners,
    ownerSelectData,
    isPending,
    handleStatusChange,
    handleUnassign,
    handleAssignConfirm,
    handleCreateAndAssign,
  }
}
