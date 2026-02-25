import { useState } from 'react'
import { Plus, Pencil, Trash2, Layers, ParkingCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useLots,
  useCreateLot,
  useUpdateLot,
  useDeleteLot,
} from '@/hooks/useLots'
import {
  useSpots,
  useCreateSpot,
  useUpdateSpot,
  useDeleteSpot,
} from '@/hooks/useSpots'
import { toast } from 'sonner'
import type { ParkingLot, Spot, SpotStatus } from '@/types'

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
        <label className="mb-1 block text-sm font-medium">Name *</label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Zunaj"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Image filename</label>
        <Input
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Image width (px)
          </label>
          <Input
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
          <label className="mb-1 block text-sm font-medium">
            Image height (px)
          </label>
          <Input
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
      toast.error('Name is required')
      return
    }
    if (dialogMode === 'add') {
      createLot.mutate(form, {
        onSuccess: () => {
          toast.success('Parking lot added')
          closeDialog()
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to create lot',
          ),
      })
    } else if (dialogMode === 'edit' && editingId) {
      updateLot.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            toast.success('Parking lot updated')
            closeDialog()
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : 'Failed to update lot',
            ),
        },
      )
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteLot.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.name}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete lot',
        ),
    })
  }

  const isSaving = createLot.isPending || updateLot.isPending
  const spotCountFor = (lotId: string) =>
    allSpots.filter((s) => s.lot_id === lotId).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Layers className="text-primary size-4" />
          Parking Lots
        </h2>
        <Button size="sm" onClick={openAdd} className="gap-2">
          <Plus className="size-4" />
          Add Lot
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-muted h-24 animate-pulse rounded-lg" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <div
              key={lot.id}
              className="bg-card flex items-start justify-between rounded-lg border p-4 shadow-sm"
            >
              <div className="space-y-1">
                <p className="font-semibold">{lot.name}</p>
                <p className="text-muted-foreground text-xs">
                  {lot.image_filename} · {lot.image_width}×{lot.image_height}
                </p>
                <p className="text-muted-foreground text-xs">
                  {spotCountFor(lot.id)} spots
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(lot)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(lot)}
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
}

const EMPTY_SPOT: SpotFormData = {
  number: '',
  label: '',
  lot_id: '',
  status: 'free',
}

function SpotForm({
  value,
  onChange,
  lots,
}: {
  value: SpotFormData
  onChange: (v: SpotFormData) => void
  lots: ParkingLot[]
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
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
        <select
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          value={value.lot_id}
          onChange={(e) => onChange({ ...value, lot_id: e.target.value })}
        >
          <option value="">Select a lot…</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Status</label>
        <select
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as SpotStatus })
          }
        >
          <option value="free">Free</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
        </select>
      </div>
    </div>
  )
}

function SpotsSection() {
  const { data: lots = [] } = useLots()
  const { data: allSpots = [], isLoading } = useSpots()
  const createSpot = useCreateSpot()
  const updateSpot = useUpdateSpot()
  const deleteSpot = useDeleteSpot()

  const [lotFilter, setLotFilter] = useState<string>('all')
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SpotFormData>(EMPTY_SPOT)
  const [deleteTarget, setDeleteTarget] = useState<Spot | null>(null)

  const displayedSpots =
    lotFilter === 'all'
      ? allSpots
      : allSpots.filter((s) => s.lot_id === lotFilter)

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
    if (!form.number || isNaN(num) || num < 1) {
      toast.error('Number must be a positive integer')
      return
    }
    if (!form.lot_id) {
      toast.error('Parking lot is required')
      return
    }

    if (dialogMode === 'add') {
      createSpot.mutate(
        {
          number: num,
          label: form.label || null,
          lot_id: form.lot_id,
          status: form.status,
        },
        {
          onSuccess: () => {
            toast.success(`Spot #${num} created`)
            closeDialog()
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : 'Failed to create spot',
            ),
        },
      )
    } else if (dialogMode === 'edit' && editingId) {
      updateSpot.mutate(
        {
          id: editingId,
          data: {
            number: num,
            label: form.label || null,
            lot_id: form.lot_id,
            status: form.status,
          },
        },
        {
          onSuccess: () => {
            toast.success(`Spot #${num} updated`)
            closeDialog()
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : 'Failed to update spot',
            ),
        },
      )
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteSpot.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Spot #${deleteTarget.number} deleted`)
        setDeleteTarget(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete spot',
        ),
    })
  }

  const isSaving = createSpot.isPending || updateSpot.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ParkingCircle className="text-primary size-4" />
          Parking Spots
        </h2>
        <div className="flex items-center gap-2">
          {/* Lot filter pills */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setLotFilter('all')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                lotFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              All
            </button>
            {lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => setLotFilter(lot.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  lotFilter === lot.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {lot.name}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openAdd} className="gap-2">
            <Plus className="size-4" />
            Add Spot
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-muted h-24 animate-pulse rounded-lg" />
      ) : displayedSpots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ParkingCircle className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">No spots found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedSpots.map((spot) => (
                <TableRow key={spot.id}>
                  <TableCell className="font-semibold">{spot.number}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {spot.label ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lotName(spot.lot_id)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        spot.status === 'free'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : spot.status === 'occupied'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {spot.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {spot.owner_name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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
              ))}
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
          <SpotForm value={form} onChange={setForm} lots={lots} />
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
      <div className="border-t pt-6">
        <SpotsSection />
      </div>
    </div>
  )
}
