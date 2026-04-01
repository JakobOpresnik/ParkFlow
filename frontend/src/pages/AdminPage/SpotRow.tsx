import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Highlight } from '@/components/ui/highlight'
import { TableCell, TableRow } from '@/components/ui/table'
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
