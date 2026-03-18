import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLots } from '@/hooks/useLots'
import { useSpots } from '@/hooks/useSpots'

import { LotForm } from './LotForm'
import { useLotDelete } from './useLotDelete'
import { useLotDialog } from './useLotDialog'

// — main component —

export function LotsSection() {
  const { t } = useTranslation()
  const { data: lots = [], isLoading } = useLots()
  const { data: allSpots = [] } = useSpots()

  const {
    dialog,
    form,
    setForm,
    isSaving,
    handleOpenAdd,
    handleOpenEdit,
    handleClose,
    handleSubmit,
  } = useLotDialog()

  const { deleteTarget, setDeleteTarget, isDeleting, handleConfirmDelete } =
    useLotDelete()

  function getSpotCount(lotId: string) {
    return allSpots.filter((s) => s.lot_id === lotId).length
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="text-primary size-4" />
          <h2 className="text-base font-semibold">{t('admin.parkingLots')}</h2>
        </div>
        <Button size="sm" onClick={handleOpenAdd} className="gap-1.5">
          <Plus className="size-3.5" />
          {t('admin.addLot')}
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-muted h-20 animate-pulse rounded-lg" />
      ) : lots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Layers className="text-muted-foreground mx-auto mb-2 size-6" />
          <p className="text-muted-foreground text-sm">
            {t('admin.noLotsYet')}
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
                  {t('admin.lotSpots', { count: getSpotCount(lot.id) })} ·{' '}
                  {lot.image_filename}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenEdit(lot)}
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

      <Dialog
        open={dialog.mode !== null}
        onOpenChange={(o) => !o && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add'
                ? t('admin.addParkingLot')
                : t('admin.editParkingLot')}
            </DialogTitle>
          </DialogHeader>
          <LotForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {t('admin.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {dialog.mode === 'add' ? t('admin.create') : t('admin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.deleteParkingLot')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t('admin.deleteAllSpotsFirst', { name: deleteTarget?.name })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('admin.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {t('admin.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
