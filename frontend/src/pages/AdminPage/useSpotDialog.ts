import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAssignOwner, useCreateSpot, useUpdateSpot } from '@/hooks/useSpots'
import type { ParkingLot, Spot } from '@/types'

import type { SpotFormData } from './SpotForm'

// — types —

type SpotDialogState =
  | { mode: null }
  | { mode: 'add' }
  | { mode: 'edit'; id: string }

// — constants —

const EMPTY_SPOT: SpotFormData = {
  number: '',
  label: '',
  lot_id: '',
  status: 'free',
  type: 'standard',
  owner_id: '',
}

// — hook —

export function useSpotDialog(lots: ParkingLot[], allSpots: Spot[]) {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<SpotDialogState>({ mode: null })
  const [form, setForm] = useState<SpotFormData>(EMPTY_SPOT)

  const createSpot = useCreateSpot()
  const updateSpot = useUpdateSpot()
  const assignOwner = useAssignOwner()

  const isSaving = createSpot.isPending || updateSpot.isPending

  function handleOpenAdd() {
    setForm({ ...EMPTY_SPOT, lot_id: lots[0]?.id ?? '' })
    setDialog({ mode: 'add' })
  }

  function handleOpenEdit(spot: Spot) {
    setForm({
      number: String(spot.number),
      label: spot.label ?? '',
      lot_id: spot.lot_id ?? '',
      status: spot.status,
      type: spot.type ?? 'standard',
      owner_id: spot.owner_id ?? '',
    })
    setDialog({ mode: 'edit', id: spot.id })
  }

  function handleClose() {
    setDialog({ mode: null })
  }

  function handleSubmit() {
    const num = Number.parseInt(form.number)
    if (!form.number || Number.isNaN(num) || num < 0) {
      notifications.show({
        message: t('admin.numberRequired'),
        color: 'red',
      })
      return
    }
    if (!form.lot_id) {
      notifications.show({
        message: t('admin.parkingLotRequired'),
        color: 'red',
      })
      return
    }

    if (dialog.mode === 'add') {
      createSpot.mutate(
        {
          number: num,
          label: form.label || null,
          lot_id: form.lot_id,
          status: form.status,
          type: form.type,
        },
        {
          onSuccess: (spot) => {
            if (form.owner_id) {
              assignOwner.mutate({ id: spot.id, owner_id: form.owner_id })
            }
            notifications.show({
              message: t('admin.spotCreated', { number: num }),
              color: 'green',
            })
            handleClose()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error
                  ? err.message
                  : t('admin.failedToCreateSpot'),
              color: 'red',
            }),
        },
      )
    } else if (dialog.mode === 'edit') {
      const currentSpot = allSpots.find((s) => s.id === dialog.id)
      const ownerChanged =
        (form.owner_id || null) !== (currentSpot?.owner_id ?? null)

      updateSpot.mutate(
        {
          id: dialog.id,
          data: {
            number: num,
            label: form.label || null,
            lot_id: form.lot_id,
            status: form.status,
            type: form.type,
          },
        },
        {
          onSuccess: () => {
            if (ownerChanged) {
              assignOwner.mutate({
                id: dialog.id,
                owner_id: form.owner_id || null,
              })
            }
            notifications.show({
              message: t('admin.spotUpdated', { number: num }),
              color: 'green',
            })
            handleClose()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error
                  ? err.message
                  : t('admin.failedToUpdateSpot'),
              color: 'red',
            }),
        },
      )
    }
  }

  return {
    dialog,
    form,
    setForm,
    isSaving,
    handleOpenAdd,
    handleOpenEdit,
    handleClose,
    handleSubmit,
  }
}
