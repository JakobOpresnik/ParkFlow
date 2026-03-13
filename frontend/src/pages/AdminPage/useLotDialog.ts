import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useCreateLot, useUpdateLot } from '@/hooks/useLots'
import type { ParkingLot } from '@/types'

import type { LotFormData } from './LotForm'

// — types —

type LotDialogState =
  | { mode: null }
  | { mode: 'add' }
  | { mode: 'edit'; id: string }

// — constants —

const EMPTY_LOT: LotFormData = {
  name: '',
  description: null,
  image_filename: 'parking-map.png',
  image_width: 1200,
  image_height: 700,
  sort_order: 0,
}

// — hook —

export function useLotDialog() {
  const [dialog, setDialog] = useState<LotDialogState>({ mode: null })
  const [form, setForm] = useState<LotFormData>(EMPTY_LOT)

  const createLot = useCreateLot()
  const updateLot = useUpdateLot()

  const isSaving = createLot.isPending || updateLot.isPending

  function handleOpenAdd() {
    setForm(EMPTY_LOT)
    setDialog({ mode: 'add' })
  }

  function handleOpenEdit(lot: ParkingLot) {
    setForm({
      name: lot.name,
      description: lot.description,
      image_filename: lot.image_filename,
      image_width: lot.image_width,
      image_height: lot.image_height,
      sort_order: lot.sort_order,
    })
    setDialog({ mode: 'edit', id: lot.id })
  }

  function handleClose() {
    setDialog({ mode: null })
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      notifications.show({ message: 'Name is required', color: 'red' })
      return
    }
    if (dialog.mode === 'add') {
      createLot.mutate(form, {
        onSuccess: () => {
          notifications.show({ message: 'Parking lot added', color: 'green' })
          handleClose()
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to create lot',
            color: 'red',
          }),
      })
    } else if (dialog.mode === 'edit') {
      updateLot.mutate(
        { id: dialog.id, data: form },
        {
          onSuccess: () => {
            notifications.show({
              message: 'Parking lot updated',
              color: 'green',
            })
            handleClose()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error ? err.message : 'Failed to update lot',
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
