import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCreateOwner } from '@/hooks/useOwners'
import { useAssignOwner } from '@/hooks/useSpots'
import type { Spot } from '@/types'

// — hook —

export function useNewOwnerForm(spot: Spot, onCreatedAndAssigned: () => void) {
  const { t } = useTranslation()
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlate, setNewPlate] = useState('')

  const createOwner = useCreateOwner()
  const assignOwner = useAssignOwner()

  function handleCreateAndAssign() {
    if (!newName.trim()) return
    createOwner.mutate(
      {
        name: newName.trim(),
        email: null,
        phone: null,
        vehicle_plate: newPlate.trim() || null,
        notes: null,
        user_id: null,
      },
      {
        onSuccess: (owner) => {
          assignOwner.mutate(
            { id: spot.id, owner_id: owner.id },
            {
              onSuccess: () => {
                notifications.show({
                  message: t('spotModal.toastOwnerCreatedAndAssigned', {
                    name: owner.name,
                    number: spot.number,
                  }),
                  color: 'green',
                })
                onCreatedAndAssigned()
                setCreateFormOpen(false)
                setNewName('')
                setNewPlate('')
              },
              onError: (err) =>
                notifications.show({
                  message:
                    err instanceof Error
                      ? err.message
                      : t('spotModal.toastAssignShortFailed'),
                  color: 'red',
                }),
            },
          )
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error
                ? err.message
                : t('spotModal.toastCreateOwnerFailed'),
            color: 'red',
          }),
      },
    )
  }

  return {
    createFormOpen,
    setCreateFormOpen,
    newName,
    setNewName,
    newPlate,
    setNewPlate,
    isPending: createOwner.isPending || assignOwner.isPending,
    handleCreateAndAssign,
  }
}
