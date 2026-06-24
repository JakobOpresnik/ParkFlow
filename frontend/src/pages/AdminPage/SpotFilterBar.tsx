import { Select } from '@mantine/core'
import { Plus, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ParkingLot, SpotStatus, SpotType } from '@/types'

import { buildPillClass } from './spotConstants'

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

// — main component —

export function SpotFilterBar({
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
      <div className="mr-auto flex flex-col flex-wrap items-start gap-2">
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

      {lots.length > 0 && (
        <div className="bg-border hidden h-18 w-px shrink-0 sm:block" />
      )}

      {/* Search + Add — pinned to the right */}
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={spotSearch}
            onChange={(e) => onSpotSearch(e.target.value)}
            placeholder={t('admin.searchSpots')}
            className="h-8 w-full pr-7 pl-8 text-sm sm:w-44"
          />
          {spotSearch && (
            <button
              onClick={() => onSpotSearch('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
              aria-label={t('common.clearSearch')}
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
