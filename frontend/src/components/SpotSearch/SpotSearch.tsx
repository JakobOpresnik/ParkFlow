import { MapPin, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Spot, SpotStatus } from '@/types'

import { useSpotSearch } from './useSpotSearch'

// — types —

interface StatusBadgeClass {
  badge: string
}

interface SpotResultProps {
  readonly spot: Spot
  readonly onClick: () => void
}

// — constants —

const STATUS_BADGE: Record<SpotStatus, StatusBadgeClass> = {
  free: { badge: 'bg-spot-free text-white border-transparent' },
  occupied: { badge: 'bg-spot-occupied text-white border-transparent' },
  reserved: { badge: 'bg-spot-reserved text-white border-transparent' },
  spotted: { badge: 'bg-spot-spotted text-white border-transparent' },
}

// — sub-components —

function SpotResult({ spot, onClick }: SpotResultProps) {
  const { t } = useTranslation()
  const STATUS_LABELS: Record<SpotStatus, string> = {
    free: t('map.free'),
    occupied: t('map.occupied'),
    reserved: t('map.reserved'),
    spotted: t('map.spotted'),
  }
  const config = STATUS_BADGE[spot.status]

  return (
    <button
      onClick={onClick}
      aria-label={`Spot ${spot.label ?? spot.number}`}
      className="bg-card hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
    >
      <MapPin className="text-muted-foreground size-4 shrink-0" />
      <span className="shrink-0 font-medium">
        {spot.label ?? `#${spot.number}`}
      </span>
      <Badge className={`ml-auto shrink-0 ${config.badge}`}>
        {STATUS_LABELS[spot.status]}
      </Badge>
    </button>
  )
}

// — main component —

export function SpotSearch() {
  const { t } = useTranslation()
  const { query, found, handleChange, handleResultClick } = useSpotSearch()

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          type="number"
          placeholder={t('map.searchByNumber')}
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
            {t('map.noSpotFound', { query })}
          </p>
        ))}
    </div>
  )
}
