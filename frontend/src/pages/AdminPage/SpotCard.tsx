import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { hasRealOwner, isDisplayedUnavailable } from '@/lib/spots'
import type { Spot } from '@/types'

import { SpotTypeConfig, StatusClass } from './spotConstants'

// — types —

interface SpotCardProps {
  readonly spot: Spot
  readonly lotName: string
  readonly onEdit: (spot: Spot) => void
  readonly onDelete: (spot: Spot) => void
}

// — main component —

export function SpotCard({ spot, lotName, onEdit, onDelete }: SpotCardProps) {
  const typeConf = SpotTypeConfig[spot.type]
  const displayStatus = spot.status
  const { t } = useTranslation()
  // Who's actually there, not necessarily the owner: the reserver for a
  // booked spot, or today's presence-confirmed occupant for one flagged
  // 'occupied' directly.
  let whoName: string | undefined | null
  if (displayStatus === 'reserved')
    whoName = spot.active_booking_reserved_by ?? spot.status_set_by
  else if (displayStatus === 'occupied') whoName = spot.in_office_owner
  const ownerIsReal = hasRealOwner(spot.owner_name)
  const isUnavailable = isDisplayedUnavailable(spot)
  return (
    <div className="bg-card rounded-lg border p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold tabular-nums">#{spot.number}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isUnavailable ? 'bg-muted text-muted-foreground' : StatusClass[displayStatus]}`}
        >
          {isUnavailable ? t('admin.unavailable') : displayStatus}
        </span>
        {whoName && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            {whoName}
          </span>
        )}
        {displayStatus === 'occupied' && !whoName && !ownerIsReal && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {t('admin.unavailable')}
          </span>
        )}
        {typeConf.badgeClass && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeConf.badgeClass}`}
          >
            {spot.type}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(spot)}
            aria-label={t('admin.editSpot')}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(spot)}
            aria-label={t('admin.deleteSpot')}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {spot.label && <span>{spot.label}</span>}
        <span>{lotName}</span>
        {spot.owner_name && <span className="truncate">{spot.owner_name}</span>}
      </div>
    </div>
  )
}
