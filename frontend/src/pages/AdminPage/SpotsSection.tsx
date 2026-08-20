import { ParkingCircle } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useLots } from '@/hooks/useLots'
import { useOwners } from '@/hooks/useOwners'
import { useSpots } from '@/hooks/useSpots'
import { dedupeSpotsById } from '@/lib/dedupeSpots'
import type { Spot } from '@/types'

import { SpotCard } from './SpotCard'
import { STICKY_ACTIONS_CLASS } from './spotConstants'
import { SpotDeleteDialog } from './SpotDeleteDialog'
import { SpotFilterBar } from './SpotFilterBar'
import { SpotForm } from './SpotForm'
import { SpotRow } from './SpotRow'
import { useSpotDelete } from './useSpotDelete'
import { useSpotDialog } from './useSpotDialog'
import { useSpotFilters } from './useSpotFilters'

// — main component —

export function SpotsSection() {
  const { t } = useTranslation()
  const { data: lots = [] } = useLots()
  const { data: owners = [] } = useOwners()

  // Raw spots (no presence/day computation) — the source of truth for
  // editing. The edit dialog PUTs `status` back verbatim (backend
  // `COALESCE($4, status)`), so it must always be seeded from the real
  // persisted status, never a computed display value, or saving an unrelated
  // field edit (e.g. the label) would silently overwrite it.
  const { data: rawSpots = [], isLoading } = useSpots()
  const rawSpotsDeduped = useMemo(() => dedupeSpotsById(rawSpots), [rawSpots])
  const rawSpotById = useMemo(() => {
    const map = new Map<string, Spot>()
    for (const s of rawSpotsDeduped) map.set(s.id, s)
    return map
  }, [rawSpotsDeduped])

  // Effective spots — today's actual state (bookings for today, presence,
  // day overrides), the same computation the Map page uses. This is what
  // the table/cards display and filter, so "current state" here matches
  // what end users see today, not a stale or arbitrary-day raw flag.
  const today = new Date().toISOString().slice(0, 10)
  const { data: allSpots = [] } = useEffectiveSpots(today)

  const {
    lotFilter,
    setLotFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    spotSearch,
    setSpotSearch,
    displayedSpots,
    getLotName,
  } = useSpotFilters(allSpots, lots)

  const {
    dialog,
    form,
    setForm,
    isSaving,
    handleOpenAdd,
    handleOpenEdit,
    handleClose,
    handleSubmit,
  } = useSpotDialog(lots, rawSpotsDeduped)

  function openEditDialog(displaySpot: Spot) {
    handleOpenEdit(rawSpotById.get(displaySpot.id) ?? displaySpot)
  }

  const { deleteTarget, setDeleteTarget, isDeleting, handleConfirmDelete } =
    useSpotDelete()

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
        <h2 className="text-base font-semibold">{t('admin.parkingSpots')}</h2>
        {!isLoading && (
          <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
            {displayedSpots.length}
            {hasFilters && ` of ${allSpots.length}`}
          </span>
        )}
      </div>

      <SpotFilterBar
        lots={lots}
        lotFilter={lotFilter}
        onLotFilter={setLotFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        spotSearch={spotSearch}
        onSpotSearch={setSpotSearch}
        onAddSpot={handleOpenAdd}
      />

      {/* Table (desktop) / Cards (mobile) */}
      {isLoading ? (
        <div className="bg-muted h-32 animate-pulse rounded-lg" />
      ) : displayedSpots.length === 0 ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center rounded-lg border text-sm">
          {hasFilters ? t('admin.noSpotsMatch') : t('admin.noSpotsYetAdd')}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {displayedSpots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                lotName={getLotName(spot.lot_id)}
                onEdit={openEditDialog}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="bg-card hidden rounded-lg border shadow-sm sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">
                    {t('admin.spotHeader')}
                  </TableHead>
                  <TableHead>{t('admin.labelHeader')}</TableHead>
                  <TableHead>{t('admin.lotHeader')}</TableHead>
                  <TableHead>{t('admin.statusHeader')}</TableHead>
                  <TableHead>{t('admin.typeHeader')}</TableHead>
                  <TableHead>{t('admin.ownerHeader')}</TableHead>
                  <TableHead
                    className={`${STICKY_ACTIONS_CLASS} w-22 text-center`}
                  >
                    {t('admin.actionsHeader')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSpots.map((spot) => (
                  <SpotRow
                    key={spot.id}
                    spot={spot}
                    spotSearch={spotSearch}
                    getLotName={getLotName}
                    onEdit={openEditDialog}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={dialog.mode !== null}
        onOpenChange={(o) => !o && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add'
                ? t('admin.addSpotTitle')
                : t('admin.editSpotTitle')}
            </DialogTitle>
          </DialogHeader>
          <SpotForm
            value={form}
            onChange={setForm}
            lots={lots}
            owners={owners}
          />
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

      <SpotDeleteDialog
        target={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
