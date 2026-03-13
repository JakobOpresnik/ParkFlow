import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useCreateSpot, useUpdateSpot } from '@/hooks/useSpots'
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
}

// — hook —

export function useSpotDialog(lots: ParkingLot[]) {
  const [dialog, setDialog] = useState<SpotDialogState>({ mode: null })
  const [form, setForm] = useState<SpotFormData>(EMPTY_SPOT)

  const createSpot = useCreateSpot()
  const updateSpot = useUpdateSpot()

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
        message: 'Number must be a positive integer',
        color: 'red',
      })
      return
    }
    if (!form.lot_id) {
      notifications.show({ message: 'Parking lot is required', color: 'red' })
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
          onSuccess: () => {
            notifications.show({
              message: `Spot #${num} created`,
              color: 'green',
            })
            handleClose()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error ? err.message : 'Failed to create spot',
              color: 'red',
            }),
        },
      )
    } else if (dialog.mode === 'edit') {
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
            notifications.show({
              message: `Spot #${num} updated`,
              color: 'green',
            })
            handleClose()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error ? err.message : 'Failed to update spot',
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
