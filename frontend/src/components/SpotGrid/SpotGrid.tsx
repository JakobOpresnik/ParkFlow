import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/store/uiStore'
import { useParkingStore } from '@/store/parkingStore'
import type { Spot, SpotStatus } from '@/types'

const STATUS_COLOR: Record<SpotStatus, string> = {
  free: 'green',
  occupied: 'red',
  reserved: 'yellow',
}

const STATUS_BORDER: Record<SpotStatus, string> = {
  free: 'border-l-spot-free',
  occupied: 'border-l-spot-occupied',
  reserved: 'border-l-spot-reserved',
}

const STATUS_LABELS: Record<SpotStatus, string> = {
  free: 'Free',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

interface SpotGridProps {
  spots: Spot[]
}

export function SpotGrid({ spots }: SpotGridProps) {
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const setSpotModalOpen = useUIStore((s) => s.setSpotModalOpen)

  function handleClick(spot: Spot) {
    setSelectedSpot(spot)
    setSpotModalOpen(true)
  }

  if (spots.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {spots.map((spot) => (
        <button
          key={spot.id}
          onClick={() => handleClick(spot)}
          className={`bg-card hover:bg-accent/50 flex flex-col gap-1 rounded-lg border border-l-4 p-3 text-left shadow-sm transition-colors ${STATUS_BORDER[spot.status]}`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-lg font-bold">#{spot.number}</span>
            <Badge className="text-xs" color={STATUS_COLOR[spot.status]}>
              {STATUS_LABELS[spot.status]}
            </Badge>
          </div>
          {spot.label && (
            <span className="text-muted-foreground text-xs">{spot.label}</span>
          )}
          <span className="text-muted-foreground mt-1 truncate text-xs">
            {spot.owner_name ?? 'Free'}
          </span>
        </button>
      ))}
    </div>
  )
}
