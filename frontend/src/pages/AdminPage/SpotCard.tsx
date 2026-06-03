import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Spot } from '@/types'

import { adminSpotStatus, SpotTypeConfig, StatusClass } from './spotConstants'

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
  const displayStatus = adminSpotStatus(spot)
  return (
    <div className="bg-card rounded-lg border p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold tabular-nums">#{spot.number}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${StatusClass[displayStatus]}`}
        >
          {displayStatus}
        </span>
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
      </div>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {spot.label && <span>{spot.label}</span>}
        <span>{lotName}</span>
        {spot.owner_name && <span className="truncate">{spot.owner_name}</span>}
      </div>
    </div>
  )
}
