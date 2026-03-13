import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ParkingLot } from '@/types'

import { LotForm } from './LotForm'
import { useLotsSection } from './useLotsSection'

// — types —

interface LotCardProps {
  readonly lot: ParkingLot
  readonly spotCount: number
  readonly onEdit: (lot: ParkingLot) => void
  readonly onDelete: (lot: ParkingLot) => void
}

// — sub-components —

function LotCard({ lot, spotCount, onEdit, onDelete }: LotCardProps) {
  return (
    <div className="bg-card flex items-start justify-between rounded-lg border p-4 shadow-sm">
      <div className="space-y-1">
        <p className="font-semibold">{lot.name}</p>
        <p className="text-muted-foreground text-xs">
          {lot.image_filename} · {lot.image_width}×{lot.image_height}
        </p>
        <p className="text-muted-foreground text-xs">{spotCount} spots</p>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(lot)}
          aria-label="Edit lot"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(lot)}
          aria-label="Delete lot"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// — main component —

export function LotsSection() {
  const {
    lots,
    isLoading,
    dialog,
    form,
    setForm,
    deleteTarget,
    setDeleteTarget,
    isSaving,
    isDeleting,
    getSpotCount,
    handleOpenAdd,
    handleOpenEdit,
    handleClose,
    handleSubmit,
    handleConfirmDelete,
  } = useLotsSection()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Layers className="text-primary size-4" />
          Parking Lots
        </h2>
        <Button size="sm" onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Add Lot
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-muted h-24 animate-pulse rounded-lg" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              spotCount={getSpotCount(lot.id)}
              onEdit={handleOpenEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Dialog
        open={dialog.mode !== null}
        onOpenChange={(o) => !o && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add' ? 'Add Parking Lot' : 'Edit Parking Lot'}
            </DialogTitle>
          </DialogHeader>
          <LotForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {dialog.mode === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
