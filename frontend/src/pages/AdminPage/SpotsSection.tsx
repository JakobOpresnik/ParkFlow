import { Menu } from '@mantine/core'
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
import { useSpots } from '@/hooks/useSpots'
import type { Spot, SpotStatus, SpotType } from '@/types'

import { SpotForm } from './SpotForm'
import { useSpotDelete } from './useSpotDelete'
import { useSpotDialog } from './useSpotDialog'
import { useSpotFilters } from './useSpotFilters'

// — types —

interface SpotRowProps {
  readonly spot: Spot
  readonly index: number
  readonly spotSearch: string
  readonly getLotName: (lotId: string | null) => string
  readonly onEdit: (spot: Spot) => void
  readonly onDelete: (spot: Spot) => void
}

// — constants —

const StatusConfig: Record<SpotStatus, { colorClasses: string }> = {
  free: {
    colorClasses:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  occupied: {
    colorClasses:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  reserved: {
    colorClasses:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
}

const TypeLabels: Record<SpotType, string> = {
  standard: 'Standard',
  ev: '⚡ EV',
  handicap: '♿ Handicap',
  compact: 'Compact',
}

// — sub-components —

function SpotRow({
  spot,
  index,
  spotSearch,
  getLotName,
  onEdit,
  onDelete,
}: SpotRowProps) {
  return (
    <TableRow>
      <TableCell className="font-semibold">{index + 1}</TableCell>
      <TableCell className="text-muted-foreground">
        {spot.label ? <Highlight text={spot.label} query={spotSearch} /> : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        <Highlight text={getLotName(spot.lot_id)} query={spotSearch} />
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${StatusConfig[spot.status].colorClasses}`}
        >
          {spot.status}
        </span>
      </TableCell>
      <TableCell>
        {spot.type !== 'standard' ? (
          <span className="text-xs font-medium">{TypeLabels[spot.type]}</span>
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
        <div className="flex items-center gap-1">
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

// — main component —

export function SpotsSection() {
  const { data: lots = [] } = useLots()
  const { data: allSpots = [], isLoading } = useSpots()

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
  } = useSpotDialog(lots)

  const { deleteTarget, setDeleteTarget, isDeleting, handleConfirmDelete } =
    useSpotDelete()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {/* Left: title */}
        <div className="flex flex-1 items-center">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ParkingCircle className="text-primary size-4" />
            Parking Spots
          </h2>
        </div>
        {/* Center: lot filter pills */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            onClick={() => setLotFilter('all')}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                lotFilter === lot.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {lot.name}
            </button>
          ))}
        </div>
        {/* Right: search + add */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={spotSearch}
              onChange={(e) => setSpotSearch(e.target.value)}
              placeholder="Search spots..."
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
            className="min-w-[100px] shrink-0 gap-2"
          >
            <Plus className="size-4" />
            Add Spot
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-muted h-24 animate-pulse rounded-lg" />
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="min-w-[160px]">
                  <div className="flex items-center gap-4">
                    <span>Lot</span>
                    <Menu withinPortal position="bottom-start">
                      <Menu.Target>
                        <button className="cursor-pointer">
                          {lotFilter === 'all' ? (
                            <span className="text-muted-foreground text-xs">
                              All ▾
                            </span>
                          ) : (
                            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                              {lots.find((l) => l.id === lotFilter)?.name}
                              <X
                                className="size-3 cursor-pointer opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setLotFilter('all')
                                }}
                              />
                            </span>
                          )}
                        </button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => setLotFilter('all')}>
                          <span className="text-xs">All</span>
                        </Menu.Item>
                        {lots.map((lot) => (
                          <Menu.Item
                            key={lot.id}
                            onClick={() => setLotFilter(lot.id)}
                          >
                            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                              {lot.name}
                            </span>
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                </TableHead>
                <TableHead className="min-w-[180px]">
                  <div className="flex items-center gap-4">
                    <span>Status</span>
                    <Menu withinPortal position="bottom-start">
                      <Menu.Target>
                        <button className="cursor-pointer">
                          {statusFilter === 'all' ? (
                            <span className="text-muted-foreground text-xs">
                              All ▾
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${StatusConfig[statusFilter].colorClasses}`}
                            >
                              {statusFilter}
                              <X
                                className="size-3 cursor-pointer opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStatusFilter('all')
                                }}
                              />
                            </span>
                          )}
                        </button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {(['all', 'free', 'occupied', 'reserved'] as const).map(
                          (v) => (
                            <Menu.Item
                              key={v}
                              onClick={() => setStatusFilter(v)}
                            >
                              {v === 'all' ? (
                                <span className="text-xs">All</span>
                              ) : (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${StatusConfig[v].colorClasses}`}
                                >
                                  {v}
                                </span>
                              )}
                            </Menu.Item>
                          ),
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <div className="flex items-center gap-4">
                    <span>Type</span>
                    <Menu withinPortal position="bottom-start">
                      <Menu.Target>
                        <button className="cursor-pointer">
                          {typeFilter === 'all' ? (
                            <span className="text-muted-foreground text-xs">
                              All ▾
                            </span>
                          ) : (
                            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                              {TypeLabels[typeFilter]}
                              <X
                                className="size-3 cursor-pointer opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTypeFilter('all')
                                }}
                              />
                            </span>
                          )}
                        </button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => setTypeFilter('all')}>
                          <span className="text-xs">All</span>
                        </Menu.Item>
                        {(
                          Object.entries(TypeLabels) as [SpotType, string][]
                        ).map(([value, label]) => (
                          <Menu.Item
                            key={value}
                            onClick={() => setTypeFilter(value)}
                          >
                            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                              {label}
                            </span>
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="bg-card before:bg-border sticky right-0 w-[100px] text-center before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedSpots.length === 0 ? (
                <TableRow style={{ height: '80px' }}>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground text-center text-sm"
                  >
                    No parking spots match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                displayedSpots.map((spot, index) => (
                  <SpotRow
                    key={spot.id}
                    spot={spot}
                    index={index}
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
              {dialog.mode === 'add' ? 'Add Spot' : 'Edit Spot'}
            </DialogTitle>
          </DialogHeader>
          <SpotForm value={form} onChange={setForm} lots={lots} />
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
