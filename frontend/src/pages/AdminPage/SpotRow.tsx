import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Highlight } from '@/components/ui/highlight'
import { TableCell, TableRow } from '@/components/ui/table'
import { useLotName } from '@/hooks/useLotName'
import { hasRealOwner, isDisplayedUnavailable } from '@/lib/spots'
import type { Spot, SpotType } from '@/types'

import {
  SpotTypeConfig,
  StatusClass,
  STICKY_ACTIONS_CLASS,
} from './spotConstants'

// — types —

interface SpotRowProps {
  readonly spot: Spot
  readonly spotSearch: string
  readonly getLotName: (id: string | null) => string
  readonly onEdit: (spot: Spot) => void
  readonly onDelete: (spot: Spot) => void
}

// — main component —

export function SpotRow({
  spot,
  spotSearch,
  getLotName,
  onEdit,
  onDelete,
}: SpotRowProps) {
  const { t } = useTranslation()
  const tLot = useLotName()
  const typeConf = SpotTypeConfig[spot.type]
  const displayStatus = spot.status
  // Who's actually there, not necessarily the owner: the reserver for a
  // booked spot, or today's presence-confirmed occupant for one flagged
  // 'occupied' directly.
  let whoName: string | undefined | null
  if (displayStatus === 'reserved')
    whoName = spot.active_booking_reserved_by ?? spot.status_set_by
  else if (displayStatus === 'occupied') whoName = spot.in_office_owner
  const ownerIsReal = hasRealOwner(spot.owner_name)
  const isUnavailable = isDisplayedUnavailable(spot)
  const STATUS_LABELS: Record<string, string> = {
    free: t('admin.freeStatus'),
    occupied: t('admin.occupiedStatus'),
    reserved: t('admin.reservedStatus'),
    spotted: t('spotModal.spottedStatus'),
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
        <Highlight text={tLot(getLotName(spot.lot_id))} query={spotSearch} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isUnavailable ? 'bg-muted text-muted-foreground' : StatusClass[displayStatus]}`}
          >
            {isUnavailable
              ? t('admin.unavailable')
              : (STATUS_LABELS[displayStatus] ?? displayStatus)}
          </span>
          {whoName && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              {whoName}
            </span>
          )}
          {displayStatus === 'occupied' && !whoName && !ownerIsReal && (
            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
              {t('admin.unavailable')}
            </span>
          )}
        </div>
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
      </TableCell>
    </TableRow>
  )
}
