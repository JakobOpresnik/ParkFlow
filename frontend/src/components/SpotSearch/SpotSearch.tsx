import { useState } from 'react'
import { Search, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSpots } from '@/hooks/useSpots'
import { useParkingStore } from '@/store/parkingStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot, SpotStatus } from '@/types'

const STATUS_BADGE: Record<SpotStatus, string> = {
  free: 'bg-spot-free text-white border-transparent',
  occupied: 'bg-spot-occupied text-white border-transparent',
  reserved: 'bg-spot-reserved text-white border-transparent',
}

const STATUS_LABELS: Record<SpotStatus, string> = {
  free: 'Free',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

export function SpotSearch() {
  const [query, setQuery] = useState('')
  const { data: spots } = useSpots()

  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const setSelectedLotId = useParkingStore((s) => s.setSelectedLotId)
  const setHighlightedSpotId = useParkingStore((s) => s.setHighlightedSpotId)
  const setSpotModalOpen = useUIStore((s) => s.setSpotModalOpen)

  const number = parseInt(query.trim(), 10)
  const found: Spot | null =
    !isNaN(number) && query.trim() !== ''
      ? ((spots ?? []).find((s) => s.number === number) ?? null)
      : null

  function handleChange(value: string) {
    setQuery(value)
    const n = parseInt(value.trim(), 10)
    if (!isNaN(n) && value.trim() !== '') {
      const spot = (spots ?? []).find((s) => s.number === n) ?? null
      if (spot) {
        setHighlightedSpotId(spot.id)
        // Auto-switch lot if spot is on a different lot
        if (spot.lot_id) setSelectedLotId(spot.lot_id)
      } else {
        setHighlightedSpotId(null)
      }
    } else {
      setHighlightedSpotId(null)
    }
  }

  function handleResultClick(spot: Spot) {
    setSelectedSpot(spot)
    setSpotModalOpen(true)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Search by spot number…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          type="number"
          min={1}
        />
      </div>

      {query.trim() !== '' &&
        (found ? (
          <button
            onClick={() => handleResultClick(found)}
            className="bg-card hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
          >
            <MapPin className="text-muted-foreground size-4 shrink-0" />
            <span className="shrink-0 font-medium">#{found.number}</span>
            {found.label && (
              <span className="text-muted-foreground min-w-0 truncate">
                {found.label}
              </span>
            )}
            <Badge className={`ml-auto shrink-0 ${STATUS_BADGE[found.status]}`}>
              {STATUS_LABELS[found.status]}
            </Badge>
          </button>
        ) : (
          <p className="text-muted-foreground px-1 text-sm">
            No spot found for number {query}.
          </p>
        ))}
    </div>
  )
}
