import { Select } from '@mantine/core'
import { ParkingCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
import { useLots } from '@/hooks/useLots'
import { useOwners } from '@/hooks/useOwners'
import { useSpots } from '@/hooks/useSpots'
import type { ParkingLot, Spot, SpotStatus, SpotType } from '@/types'

import { SpotForm } from './SpotForm'
import { useSpotDelete } from './useSpotDelete'
import { useSpotDialog } from './useSpotDialog'
import { useSpotFilters } from './useSpotFilters'

// — types —

interface SpotFilterBarProps {
  readonly lots: ParkingLot[]
  readonly lotFilter: string
  readonly onLotFilter: (id: string) => void
  readonly statusFilter: SpotStatus | 'all'
  readonly onStatusFilter: (v: SpotStatus | 'all') => void
  readonly typeFilter: SpotType | 'all'
  readonly onTypeFilter: (v: SpotType | 'all') => void
  readonly spotSearch: string
  readonly onSpotSearch: (v: string) => void
  readonly onAddSpot: () => void
}

interface SpotRowProps {
  readonly spot: Spot
  readonly spotSearch: string
  readonly getLotName: (id: string | null) => string
  readonly onEdit: (spot: Spot) => void
  readonly onDelete: (spot: Spot) => void
}

interface SpotDeleteDialogProps {
  readonly target: Spot | null
  readonly isDeleting: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

// — constants —

const StatusClass: Record<SpotStatus, string> = {
  free: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  occupied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  reserved:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const SpotTypeConfig: Record<
  SpotType,
  { label: string; badgeClass: string | null }
> = {
  standard: { label: 'Standard', badgeClass: null },
  ev: {
    label: 'EV Charging',
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  handicap: {
    label: 'Handicap',
    badgeClass:
      'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  compact: { label: 'Compact', badgeClass: 'bg-muted text-muted-foreground' },
}

const STICKY_ACTIONS_CLASS =
  "bg-card before:bg-border sticky right-0 before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100"

// — helpers —

function buildPillClass(active: boolean) {
  return `cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'text-muted-foreground border-border hover:text-foreground'
  }`
}

// — sub-components —

function SpotFilterBar({
  lots,
  lotFilter,
  onLotFilter,
  statusFilter,
  onStatusFilter,
  typeFilter,
  onTypeFilter,
  spotSearch,
  onSpotSearch,
  onAddSpot,
}: SpotFilterBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <div className="mr-auto flex flex-col flex-wrap items-start gap-3">
        {/* Lot pills */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onLotFilter('all')}
            className={buildPillClass(lotFilter === 'all')}
          >
            {t('admin.allLots')}
          </button>
          {lots.map((lot: ParkingLot) => (
            <button
              key={lot.id}
              onClick={() => onLotFilter(lot.id)}
              className={buildPillClass(lotFilter === lot.id)}
            >
              {lot.name}
            </button>
          ))}
        </div>

        <div className="flex flex-row flex-wrap items-center gap-2">
          {/* Status filter */}
          <Select
            value={statusFilter}
            onChange={(v) => onStatusFilter((v ?? 'all') as SpotStatus | 'all')}
            data={[
              { value: 'all', label: t('admin.allStatuses') },
              { value: 'free', label: t('admin.freeStatus') },
              { value: 'occupied', label: t('admin.occupiedStatus') },
              { value: 'reserved', label: t('admin.reservedStatus') },
            ]}
            size="xs"
            allowDeselect={false}
            className="w-32"
            checkIconPosition="right"
          />

          {/* Type filter */}
          <Select
            value={typeFilter}
            onChange={(v) => onTypeFilter((v ?? 'all') as SpotType | 'all')}
            data={[
              { value: 'all', label: t('admin.allTypes') },
              { value: 'standard', label: t('admin.standard') },
              { value: 'ev', label: t('admin.evCharging') },
              { value: 'handicap', label: t('admin.handicap') },
              { value: 'compact', label: t('admin.compact') },
            ]}
            size="xs"
            allowDeselect={false}
            className="w-32"
            checkIconPosition="right"
          />
        </div>
      </div>

      {lots.length > 0 && <div className="bg-border h-18 w-px shrink-0" />}

      {/* Search + Add — pinned to the right */}
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={spotSearch}
            onChange={(e) => onSpotSearch(e.target.value)}
            placeholder={t('admin.searchSpots')}
            className="h-8 w-44 pr-7 pl-8 text-sm"
          />
          {spotSearch && (
            <button
              onClick={() => onSpotSearch('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button size="sm" onClick={onAddSpot} className="shrink-0 gap-1.5">
          <Plus className="size-3.5" />
          {t('admin.addSpot')}
        </Button>
      </div>
    </div>
  )
}

function SpotRow({
  spot,
  spotSearch,
  getLotName,
  onEdit,
  onDelete,
}: SpotRowProps) {
  const { t } = useTranslation()
  const typeConf = SpotTypeConfig[spot.type]
  const STATUS_LABELS: Record<string, string> = {
    free: t('admin.freeStatus'),
    occupied: t('admin.occupiedStatus'),
    reserved: t('admin.reservedStatus'),
  }
  const TYPE_LABELS: Record<SpotType, string> = {
    standard: t('admin.standard'),
    ev: t('admin.evCharging'),
    handicap: t('admin.handicap'),
    compact: t('admin.compact'),
  }
  return (
    <TableRow>
      <TableCell className="text-center font-semibold tabular-nums">
        {spot.number}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {spot.label ? <Highlight text={spot.label} query={spotSearch} /> : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        <Highlight text={getLotName(spot.lot_id)} query={spotSearch} />
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${StatusClass[spot.status]}`}
        >
          {STATUS_LABELS[spot.status] ?? spot.status}
        </span>
      </TableCell>
      <TableCell>
        {typeConf.badgeClass ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConf.badgeClass}`}
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
      <TableCell className={STICKY_ACTIONS_CLASS}>
        <div className="flex items-center justify-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(spot)}
            aria-label="Edit spot"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(spot)}
            aria-label="Delete spot"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function SpotDeleteDialog({
  target,
  isDeleting,
  onConfirm,
  onCancel,
}: SpotDeleteDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.deleteSpotTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t('admin.deleteSpotConfirm', { number: target?.number })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('admin.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {t('admin.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// — main component —

export function SpotsSection() {
  const { t } = useTranslation()
  const { data: lots = [] } = useLots()
  const { data: allSpots = [], isLoading } = useSpots()
  const { data: owners = [] } = useOwners()

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
  } = useSpotDialog(lots, allSpots)

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

      {/* Table */}
      {isLoading ? (
        <div className="bg-muted h-32 animate-pulse rounded-lg" />
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">{t('admin.spotHeader')}</TableHead>
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
              {displayedSpots.length === 0 ? (
                <TableRow className="h-20">
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground text-center text-sm"
                  >
                    {hasFilters
                      ? t('admin.noSpotsMatch')
                      : t('admin.noSpotsYetAdd')}
                  </TableCell>
                </TableRow>
              ) : (
                displayedSpots.map((spot) => (
                  <SpotRow
                    key={spot.id}
                    spot={spot}
                    spotSearch={spotSearch}
                    getLotName={getLotName}
                    onEdit={handleOpenEdit}
                    onDelete={setDeleteTarget}
                  />
                ))
              )}
            </TableBody>
          </Table>
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
