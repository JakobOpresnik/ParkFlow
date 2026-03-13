import { notifications } from '@mantine/notifications'
import { useMemo, useState } from 'react'

import { useLots } from '@/hooks/useLots'
import {
  useCreateSpot,
  useDeleteSpot,
  useSpots,
  useUpdateSpot,
} from '@/hooks/useSpots'
import type { Spot, SpotStatus, SpotType } from '@/types'

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

export function useSpotsSection() {
  const { data: lots = [] } = useLots()
  const { data: allSpots = [], isLoading } = useSpots()
  const createSpot = useCreateSpot()
  const updateSpot = useUpdateSpot()
  const deleteSpot = useDeleteSpot()

  const [lotFilter, setLotFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<SpotStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<SpotType | 'all'>('all')
  const [spotSearch, setSpotSearch] = useState('')
  const [dialog, setDialog] = useState<SpotDialogState>({ mode: null })
  const [form, setForm] = useState<SpotFormData>(EMPTY_SPOT)
  const [deleteTarget, setDeleteTarget] = useState<Spot | null>(null)

  const isSaving = createSpot.isPending || updateSpot.isPending

  const displayedSpots = useMemo(() => {
    let filtered =
      lotFilter === 'all'
        ? allSpots
        : allSpots.filter((s) => s.lot_id === lotFilter)

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((s) => (s.type ?? 'standard') === typeFilter)
    }

    if (spotSearch.trim()) {
      const q = spotSearch.toLowerCase()
      const lotNameMap = new Map(lots.map((l) => [l.id, l.name.toLowerCase()]))
      filtered = filtered.filter(
        (s) =>
          (s.label?.toLowerCase().includes(q) ?? false) ||
          (s.owner_name?.toLowerCase().includes(q) ?? false) ||
          String(s.number).includes(q) ||
          (lotNameMap.get(s.lot_id ?? '')?.includes(q) ?? false),
      )
    }

    return filtered
  }, [allSpots, lotFilter, statusFilter, typeFilter, spotSearch, lots])

  function getLotName(lotId: string | null) {
    return lots.find((l) => l.id === lotId)?.name ?? '—'
  }

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

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteSpot.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: `Spot #${deleteTarget.number} deleted`,
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Failed to delete spot',
          color: 'red',
        }),
    })
  }

  return {
    lots,
    isLoading,
    lotFilter,
    setLotFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    spotSearch,
    setSpotSearch,
    dialog,
    form,
    setForm,
    deleteTarget,
    setDeleteTarget,
    isSaving,
    isDeleting: deleteSpot.isPending,
    displayedSpots,
    getLotName,
    handleOpenAdd,
    handleOpenEdit,
    handleClose,
    handleSubmit,
    handleConfirmDelete,
  }
}
