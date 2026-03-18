import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SpotSearch } from '@/components/SpotSearch/SpotSearch'
import type { ParkingLot, Spot } from '@/types'

import { MapLegend } from './MapLegend'
import { StatCards } from './StatCards'

// ─── types ────────────────────────────────────────────────────────────────────

interface MapSidebarProps {
  readonly isOpen: boolean
  readonly activeLot: ParkingLot | null
  readonly lotSpots: Spot[]
  readonly isLoading: boolean
  readonly onClose: () => void
}

// ─── component ────────────────────────────────────────────────────────────────

export function MapSidebar({
  isOpen,
  activeLot,
  lotSpots,
  isLoading,
  onClose,
}: MapSidebarProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Backdrop (mobile tap-to-close) */}
      {isOpen && (
        <div
          role="presentation"
          className="absolute inset-0 z-20 bg-black/30 sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`bg-background/95 absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l shadow-2xl backdrop-blur-sm transition-transform duration-300 sm:w-80 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <p className="font-semibold">
            {activeLot?.name ?? t('map.parkingMap')}
          </p>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="hover:bg-muted flex size-9 items-center justify-center rounded-lg transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <SpotSearch />

          {activeLot && lotSpots.length > 0 && (
            <>
              <MapLegend />
              <StatCards spots={lotSpots} />
            </>
          )}

          {!isLoading && activeLot && lotSpots.length === 0 && (
            <p className="text-muted-foreground text-center text-sm">
              {t('map.noSpotsYet')}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
