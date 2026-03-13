import { Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  Layers,
  ParkingCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Highlight } from '@/components/ui/highlight'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreateLot,
  useDeleteLot,
  useLots,
  useUpdateLot,
} from '@/hooks/useLots'
import { useOwners } from '@/hooks/useOwners'
import {
  useAssignOwner,
  useCreateSpot,
  useDeleteSpot,
  useSpots,
  useUpdateSpot,
} from '@/hooks/useSpots'
import type { Owner, ParkingLot, Spot, SpotStatus, SpotType } from '@/types'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SpotType, string> = {
  standard: 'Standard',
  ev: 'EV Charging',
  handicap: 'Handicap',
  compact: 'Compact',
}

const TYPE_BADGE_CLASS: Partial<Record<SpotType, string>> = {
  ev: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  handicap:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  compact: 'bg-muted text-muted-foreground',
}

const STATUS_CLASS: Record<SpotStatus, string> = {
  free: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  occupied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  reserved:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function pill(active: boolean) {
  return `cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'text-muted-foreground border-border hover:text-foreground'
  }`
}

// ─── Lot management ────────────────────────────────────────────────────────────

type LotFormData = Omit<ParkingLot, 'id' | 'created_at'>

const EMPTY_LOT: LotFormData = {
  name: '',
  description: null,
  image_filename: 'parking-map.png',
  image_width: 1200,
  image_height: 700,
  sort_order: 0,
}

function LotForm({
  value,
  onChange,
}: {
  value: LotFormData
  onChange: (v: LotFormData) => void
}) {
  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor="lot-name" className="mb-1 block text-sm font-medium">
          Name *
        </label>
        <Input
          id="lot-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Zunaj"
        />
      </div>
      <div>
        <label
          htmlFor="lot-image-filename"
          className="mb-1 block text-sm font-medium"
        >
          Image filename
        </label>
        <Input
          id="lot-image-filename"
          value={value.image_filename}
          onChange={(e) =>
            onChange({ ...value, image_filename: e.target.value })
          }
          placeholder="parking-map-outside.png"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Place the image in <code>frontend/public/</code>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="lot-image-width"
            className="mb-1 block text-sm font-medium"
          >
            Image width (px)
          </label>
          <Input
            id="lot-image-width"
            type="number"
            value={value.image_width}
            onChange={(e) =>
              onChange({
                ...value,
                image_width: parseInt(e.target.value) || 1200,
              })
            }
          />
        </div>
        <div>
          <label
            htmlFor="lot-image-height"
            className="mb-1 block text-sm font-medium"
          >
            Image height (px)
          </label>
          <Input
            id="lot-image-height"
            type="number"
            value={value.image_height}
            onChange={(e) =>
              onChange({
                ...value,
                image_height: parseInt(e.target.value) || 700,
              })
            }
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Sort order</label>
        <Input
          type="number"
          value={value.sort_order}
          onChange={(e) =>
            onChange({ ...value, sort_order: parseInt(e.target.value) || 0 })
          }
        />
      </div>
    </div>
  )
}

function LotsSection() {
  const { data: lots = [], isLoading } = useLots()
  const { data: allSpots = [] } = useSpots()
  const createLot = useCreateLot()
  const updateLot = useUpdateLot()
  const deleteLot = useDeleteLot()

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LotFormData>(EMPTY_LOT)
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null)

  function openAdd() {
    setForm(EMPTY_LOT)
    setEditingId(null)
    setDialogMode('add')
  }

  function openEdit(lot: ParkingLot) {
    setForm({
      name: lot.name,
      description: lot.description,
      image_filename: lot.image_filename,
      image_width: lot.image_width,
      image_height: lot.image_height,
      sort_order: lot.sort_order,
    })
    setEditingId(lot.id)
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setEditingId(null)
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      notifications.show({ message: 'Name is required', color: 'red' })
      return
    }
    if (dialogMode === 'add') {
      createLot.mutate(form, {
        onSuccess: () => {
          notifications.show({ message: 'Parking lot added', color: 'green' })
          closeDialog()
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to create lot',
            color: 'red',
          }),
      })
    } else if (dialogMode === 'edit' && editingId) {
      updateLot.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            notifications.show({
              message: 'Parking lot updated',
              color: 'green',
            })
            closeDialog()
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

  function confirmDelete() {
    if (!deleteTarget) return
    deleteLot.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: `"${deleteTarget.name}" deleted`,
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Failed to delete lot',
          color: 'red',
        }),
    })
  }

  const isSaving = createLot.isPending || updateLot.isPending
  const spotCountFor = (lotId: string) =>
    allSpots.filter((s) => s.lot_id === lotId).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="text-primary size-4" />
          <h2 className="text-base font-semibold">Parking Lots</h2>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="size-3.5" />
          Add Lot
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-muted h-20 animate-pulse rounded-lg" />
      ) : lots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Layers className="text-muted-foreground mx-auto mb-2 size-6" />
          <p className="text-muted-foreground text-sm">
            No lots yet. Add the first one.
          </p>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
          {lots.map((lot, i) => (
            <div
              key={lot.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < lots.length - 1 ? 'border-b' : ''}`}
            >
              <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-md">
                <Layers className="text-primary size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{lot.name}</p>
                <p className="text-muted-foreground text-xs">
                  {spotCountFor(lot.id)} spots · {lot.image_filename}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(lot)}
                  aria-label={`Edit ${lot.name}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(lot)}
                  aria-label={`Delete ${lot.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Add Parking Lot' : 'Edit Parking Lot'}
            </DialogTitle>
          </DialogHeader>
          <LotForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {dialogMode === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Parking Lot</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Delete <strong>{deleteTarget?.name}</strong>? All spots must be
            removed or reassigned first.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLot.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Spot management ───────────────────────────────────────────────────────────

type SpotFormData = {
  number: string
  label: string
  lot_id: string
  status: SpotStatus
  type: SpotType
  owner_id: string
}

const EMPTY_SPOT: SpotFormData = {
  number: '',
  label: '',
  lot_id: '',
  status: 'free',
  type: 'standard',
  owner_id: '',
}

function SpotForm({
  value,
  onChange,
  lots,
  owners,
}: {
  value: SpotFormData
  onChange: (v: SpotFormData) => void
  lots: ParkingLot[]
  owners: Owner[]
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Number *</label>
          <Input
            type="number"
            min={1}
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            placeholder="1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Label</label>
          <Input
            value={value.label}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="A1"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Parking Lot *</label>
        <Select
          value={value.lot_id || null}
          onChange={(v) => onChange({ ...value, lot_id: v ?? '' })}
          data={lots.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="Select a lot…"
          allowDeselect={false}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <Select
            value={value.status}
            onChange={(v) =>
              onChange({ ...value, status: (v ?? 'free') as SpotStatus })
            }
            data={[
              { value: 'free', label: 'Free' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'reserved', label: 'Reserved' },
            ]}
            allowDeselect={false}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <Select
            value={value.type}
            onChange={(v) =>
              onChange({ ...value, type: (v ?? 'standard') as SpotType })
            }
            data={[
              { value: 'standard', label: 'Standard' },
              { value: 'ev', label: 'EV Charging' },
              { value: 'handicap', label: 'Handicap' },
              { value: 'compact', label: 'Compact' },
            ]}
            allowDeselect={false}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Owner</label>
        <select
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          value={value.owner_id}
          onChange={(e) => onChange({ ...value, owner_id: e.target.value })}
        >
          <option value="">No owner</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.user_id ? ` (${o.user_id})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function SpotsSection() {
  const { data: lots = [] } = useLots()
  const { data: allSpots = [], isLoading } = useSpots()
  const { data: owners = [] } = useOwners()
  const createSpot = useCreateSpot()
  const updateSpot = useUpdateSpot()
  const deleteSpot = useDeleteSpot()
  const assignOwner = useAssignOwner()

  const [lotFilter, setLotFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<SpotStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<SpotType | 'all'>('all')
  const [spotSearch, setSpotSearch] = useState('')
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SpotFormData>(EMPTY_SPOT)
  const [deleteTarget, setDeleteTarget] = useState<Spot | null>(null)

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

  function lotName(lotId: string | null) {
    return lots.find((l) => l.id === lotId)?.name ?? '—'
  }

  function openAdd() {
    setForm({ ...EMPTY_SPOT, lot_id: lots[0]?.id ?? '' })
    setEditingId(null)
    setDialogMode('add')
  }

  function openEdit(spot: Spot) {
    setForm({
      number: String(spot.number),
      label: spot.label ?? '',
      lot_id: spot.lot_id ?? '',
      status: spot.status,
      type: spot.type ?? 'standard',
      owner_id: spot.owner_id ?? '',
    })
    setEditingId(spot.id)
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setEditingId(null)
  }

  function handleSubmit() {
    const num = parseInt(form.number)
    if (!form.number || isNaN(num) || num < 0) {
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

    if (dialogMode === 'add') {
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
              message: `Spot #${num} created`,
              color: 'green',
            })
            closeDialog()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error ? err.message : 'Failed to create spot',
              color: 'red',
            }),
        },
      )
    } else if (dialogMode === 'edit' && editingId) {
      const currentSpot = allSpots.find((s) => s.id === editingId)
      const ownerChanged =
        (form.owner_id || null) !== (currentSpot?.owner_id ?? null)

      updateSpot.mutate(
        {
          id: editingId,
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
                id: editingId,
                owner_id: form.owner_id || null,
              })
            }
            notifications.show({
              message: `Spot #${num} updated`,
              color: 'green',
            })
            closeDialog()
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

  function confirmDelete() {
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

  const isSaving = createSpot.isPending || updateSpot.isPending
  const hasFilters =
    lotFilter !== 'all' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    spotSearch.trim() !== ''

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <ParkingCircle className="text-primary size-4" />
        <h2 className="text-base font-semibold">Parking Spots</h2>
        {!isLoading && (
          <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
            {displayedSpots.length}
            {hasFilters && ` of ${allSpots.length}`}
          </span>
        )}
      </div>

      {/* Unified filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Lot pills */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setLotFilter('all')}
            className={pill(lotFilter === 'all')}
          >
            All
          </button>
          {lots.map((lot) => (
            <button
              key={lot.id}
              onClick={() => setLotFilter(lot.id)}
              className={pill(lotFilter === lot.id)}
            >
              {lot.name}
            </button>
          ))}
        </div>

        {lots.length > 0 && <div className="bg-border h-4 w-px shrink-0" />}

        {/* Status filter */}
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter((v ?? 'all') as SpotStatus | 'all')}
          data={[
            { value: 'all', label: 'All statuses' },
            { value: 'free', label: 'Free' },
            { value: 'occupied', label: 'Occupied' },
            { value: 'reserved', label: 'Reserved' },
          ]}
          size="xs"
          allowDeselect={false}
          className="w-32"
        />

        {/* Type filter */}
        <Select
          value={typeFilter}
          onChange={(v) => setTypeFilter((v ?? 'all') as SpotType | 'all')}
          data={[
            { value: 'all', label: 'All types' },
            { value: 'standard', label: 'Standard' },
            { value: 'ev', label: 'EV Charging' },
            { value: 'handicap', label: 'Handicap' },
            { value: 'compact', label: 'Compact' },
          ]}
          size="xs"
          allowDeselect={false}
          className="w-32"
        />

        {/* Search + Add — pinned to the right */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={spotSearch}
              onChange={(e) => setSpotSearch(e.target.value)}
              placeholder="Search spots…"
              className="h-8 w-44 pr-7 pl-8 text-sm"
            />
            {spotSearch && (
              <button
                onClick={() => setSpotSearch('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={openAdd} className="shrink-0 gap-1.5">
            <Plus className="size-3.5" />
            Add Spot
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-muted h-32 animate-pulse rounded-lg" />
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Spot</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="bg-card before:bg-border sticky right-0 w-22 text-center before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedSpots.length === 0 ? (
                <TableRow className="h-20">
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground text-center text-sm"
                  >
                    {hasFilters
                      ? 'No spots match the current filters.'
                      : 'No spots yet. Add the first one.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayedSpots.map((spot) => (
                  <TableRow key={spot.id}>
                    <TableCell className="font-semibold tabular-nums">
                      {spot.number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {spot.label ? (
                        <Highlight text={spot.label} query={spotSearch} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <Highlight
                        text={lotName(spot.lot_id)}
                        query={spotSearch}
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[spot.status]}`}
                      >
                        {spot.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {spot.type !== 'standard' ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[spot.type] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {TYPE_LABELS[spot.type]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {spot.owner_name ? (
                        <Highlight text={spot.owner_name} query={spotSearch} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="bg-card before:bg-border sticky right-0 before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(spot)}
                          aria-label="Edit spot"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(spot)}
                          aria-label="Delete spot"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Add Spot' : 'Edit Spot'}
            </DialogTitle>
          </DialogHeader>
          <SpotForm
            value={form}
            onChange={setForm}
            lots={lots}
            owners={owners}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {dialogMode === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Spot</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Delete spot <strong>#{deleteTarget?.number}</strong>? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteSpot.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage parking lots and spots
        </p>
      </div>
      <LotsSection />
      <SpotsSection />
    </div>
  )
}
