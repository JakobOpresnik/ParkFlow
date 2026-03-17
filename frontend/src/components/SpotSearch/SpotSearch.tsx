import { MapPin, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Spot, SpotStatus } from '@/types'

import { useSpotSearch } from './useSpotSearch'

// — types —

interface StatusConfigDetails {
  badge: string
  label: string
}

interface SpotResultProps {
  readonly spot: Spot
  readonly onClick: () => void
}

// — constants —

const STATUS_CONFIG: Record<SpotStatus, StatusConfigDetails> = {
  free: { badge: 'bg-spot-free text-white border-transparent', label: 'Free' },
  occupied: {
    badge: 'bg-spot-occupied text-white border-transparent',
    label: 'Occupied',
  },
  reserved: {
    badge: 'bg-spot-reserved text-white border-transparent',
    label: 'Reserved',
  },
}

// — sub-components —

function SpotResult({ spot, onClick }: SpotResultProps) {
  const config = STATUS_CONFIG[spot.status]

  return (
    <button
      onClick={onClick}
      aria-label={`Spot ${spot.number}`}
      className="bg-card hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
    >
      <MapPin className="text-muted-foreground size-4 shrink-0" />
      <span className="shrink-0 font-medium">#{spot.number}</span>
      {spot.label && (
        <span className="text-muted-foreground min-w-0 truncate">
          {spot.label}
        </span>
      )}
      <Badge className={`ml-auto shrink-0 ${config.badge}`}>
        {config.label}
      </Badge>
    </button>
  )
}

// — main component —

export function SpotSearch() {
  const { query, found, handleChange, handleResultClick } = useSpotSearch()

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          type="number"
          placeholder="Search by spot number…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          min={1}
        />
      </div>

      {query.trim() !== '' &&
        (found ? (
          <SpotResult spot={found} onClick={() => handleResultClick(found)} />
        ) : (
          <p className="text-muted-foreground px-1 text-sm">
            No spot found for number {query}.
          </p>
        ))}
    </div>
  )
}
