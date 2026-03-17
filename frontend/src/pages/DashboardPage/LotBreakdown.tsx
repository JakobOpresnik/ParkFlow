import type { ParkingLot, Spot } from '@/types'

import { countByStatus } from './utils'

// — types —

interface LotBarProps {
  readonly name: string
  readonly free: number
  readonly occupied: number
  readonly reserved: number
  readonly total: number
}

interface LotBreakdownProps {
  readonly lots: readonly ParkingLot[]
  readonly allSpots: readonly Spot[]
}

// — constants —

const LOT_LEGEND = [
  { label: 'Free', color: 'var(--color-spot-free)' },
  { label: 'Occupied', color: 'var(--color-spot-occupied)' },
  { label: 'Reserved', color: 'var(--color-spot-reserved)' },
]

// — sub-components —

function LotBar({ name, free, occupied, reserved, total }: LotBarProps) {
  const freePct = total ? (free / total) * 100 : 0
  const occupiedPct = total ? (occupied / total) * 100 : 0
  const reservedPct = total ? (reserved / total) * 100 : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {free}
          <span className="text-muted-foreground/40 mx-0.5">/</span>
          {total}
        </span>
      </div>
      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${occupiedPct}%`,
            background: 'var(--color-spot-occupied)',
          }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${reservedPct}%`,
            background: 'var(--color-spot-reserved)',
          }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${freePct}%`, background: 'var(--color-spot-free)' }}
        />
      </div>
    </div>
  )
}

// — main component —

export function LotBreakdown({ lots, allSpots }: LotBreakdownProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">By location</h2>
        <div className="flex items-center gap-3">
          {LOT_LEGEND.map(({ label, color }) => (
            <span
              key={label}
              className="text-muted-foreground flex items-center gap-1 text-[11px]"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-4 p-4">
        {lots.map((lot) => {
          const lotSpots = allSpots.filter((s) => s.lot_id === lot.id)
          return (
            <LotBar
              key={lot.id}
              name={lot.name}
              free={countByStatus(lotSpots, 'free')}
              occupied={countByStatus(lotSpots, 'occupied')}
              reserved={countByStatus(lotSpots, 'reserved')}
              total={lotSpots.length}
            />
          )
        })}
      </div>
    </div>
  )
}
