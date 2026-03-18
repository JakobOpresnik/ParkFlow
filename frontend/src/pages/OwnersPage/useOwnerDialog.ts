import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCreateOwner, useUpdateOwner } from '@/hooks/useOwners'
import type { Owner } from '@/types'

import type { OwnerFormData } from './types'

// — constants —

const EMPTY_FORM: OwnerFormData = {
  name: '',
  email: null,
  phone: null,
  vehicle_plate: null,
  notes: null,
  user_id: null,
}

// — hooks —

export function useOwnerDialog() {
  const { t } = useTranslation()
  const createOwner = useCreateOwner()
  const updateOwner = useUpdateOwner()

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<OwnerFormData>(EMPTY_FORM)

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setDialogMode('add')
  }

  function openEdit(owner: Owner) {
    setForm({
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      vehicle_plate: owner.vehicle_plate,
      notes: owner.notes,
      user_id: owner.user_id,
    })
    setEditingId(owner.id)
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setEditingId(null)
  }

  function handleSubmit() {
    if (!form.name?.trim()) {
      notifications.show({
        message: t('owners.ownerNameRequired'),
        color: 'red',
      })
      return
    }

    if (dialogMode === 'add') {
      createOwner.mutate(form, {
        onSuccess: () => {
          notifications.show({
            message: t('owners.ownerAdded'),
            color: 'green',
          })
          closeDialog()
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error
                ? err.message
                : t('owners.failedToCreateOwner'),
            color: 'red',
          }),
      })
    } else if (dialogMode === 'edit' && editingId) {
      updateOwner.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            notifications.show({
              message: t('owners.ownerUpdated'),
              color: 'green',
            })
            closeDialog()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error
                  ? err.message
                  : t('owners.failedToUpdateOwner'),
              color: 'red',
            }),
        },
      )
    }
  }

  const isSaving = createOwner.isPending || updateOwner.isPending

  return {
    form,
    setForm,
    dialogMode,
    isSaving,
    openAdd,
    openEdit,
    closeDialog,
    handleSubmit,
  }
}
