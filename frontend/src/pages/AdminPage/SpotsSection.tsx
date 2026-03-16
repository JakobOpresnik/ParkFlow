import { Select } from '@mantine/core'
import { ParkingCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

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
import type { SpotStatus, SpotType } from '@/types'

import { SpotForm } from './SpotForm'
import { useSpotDelete } from './useSpotDelete'
import { useSpotDialog } from './useSpotDialog'
import { useSpotFilters } from './useSpotFilters'

// — constants —

const STATUS_CLASS: Record<SpotStatus, string> = {
  free: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  occupied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  reserved:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

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

function pill(active: boolean) {
  return `cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'text-muted-foreground border-border hover:text-foreground'
  }`
}

// — main component —

export function SpotsSection() {
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
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="shrink-0 gap-1.5"
          >
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
                        text={getLotName(spot.lot_id)}
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
                          onClick={() => handleOpenEdit(spot)}
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

      <Dialog
        open={dialog.mode !== null}
        onOpenChange={(o) => !o && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add' ? 'Add Spot' : 'Edit Spot'}
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
