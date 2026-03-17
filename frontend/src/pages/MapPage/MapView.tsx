import { AlertCircle, MapPin } from 'lucide-react'
import type { CSSProperties, RefObject } from 'react'

import type { ParkingMapHandle } from '@/components/ParkingMap/ParkingMap'
import { ParkingMap } from '@/components/ParkingMap/ParkingMap'
import type { ParkingLot, Spot } from '@/types'

// — types —

interface MapViewProps {
  readonly activeLot: ParkingLot | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly lotSpots: Spot[]
  readonly selectedSpotId: string | null
  readonly highlightedSpotId: string | null
  readonly shouldBlurMap: boolean
  readonly onSpotClick: (spot: Spot) => void
  readonly mapRef: RefObject<ParkingMapHandle | null>
}

// — constants —

const MapFrameStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
}

// — main component —

export function MapView({
  activeLot,
  isLoading,
  isError,
  lotSpots,
  selectedSpotId,
  highlightedSpotId,
  shouldBlurMap,
  onSpotClick,
  mapRef,
}: MapViewProps) {
  const isMapEmpty = !isLoading && !isError && activeLot === null

  const mapAspectStyle: CSSProperties = {
    aspectRatio: activeLot
      ? `${activeLot.image_width} / ${activeLot.image_height}`
      : '4 / 3',
    maxWidth: '100%',
    maxHeight: '100%',
    flex: '0 1 auto',
  }

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-4 transition-[filter] duration-300 ${shouldBlurMap ? 'blur-[3px]' : ''}`}
    >
      <div
        className="relative h-full max-h-full w-full max-w-full"
        style={mapAspectStyle}
      >
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}

        {isError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
            <AlertCircle className="size-8" />
            <p className="text-sm">Could not load parking data</p>
            <p className="text-xs opacity-60">
              Check that the backend is running
            </p>
          </div>
        )}

        {isMapEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
            <MapPin className="size-8" />
            <p className="text-sm">No parking lots found</p>
            <p className="text-xs opacity-60">Add a lot via the Admin page</p>
          </div>
        )}

        {!isLoading && !isError && activeLot && (
          <div
            className="absolute inset-0 overflow-hidden rounded-xl"
            style={MapFrameStyle}
          >
            <ParkingMap
              key={activeLot.id}
              ref={mapRef}
              lot={activeLot}
              spots={lotSpots}
              selectedSpotId={selectedSpotId}
              highlightedSpotId={highlightedSpotId}
              onSpotClick={onSpotClick}
              invertFloorPlan
            />
          </div>
        )}
      </div>
    </div>
  )
}
