import { Clock, User } from 'lucide-react'

import { ReservationTimer } from '@/components/ReservationTimer'
import { useParkingStore } from '@/store/parkingStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot, SpotStatus } from '@/types'

const STATUS_ACCENT: Record<SpotStatus, string> = {
  free: 'bg-spot-free',
  occupied: 'bg-spot-occupied',
  reserved: 'bg-spot-reserved',
}

const STATUS_TEXT: Record<SpotStatus, string> = {
  free: 'text-spot-free',
  occupied: 'text-spot-occupied',
  reserved: 'text-spot-reserved',
}

const STATUS_LABELS: Record<SpotStatus, string> = {
  free: 'Free',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

interface SpotGridProps {
  readonly spots: readonly Spot[]
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {spots.map((spot) => (
        <button
          key={spot.id}
          onClick={() => handleClick(spot)}
          className="bg-card group relative cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          {/* Colored top accent strip */}
          <div
            className={`absolute inset-x-0 top-0 h-1 ${STATUS_ACCENT[spot.status]}`}
          />

          {/* Header: number + status */}
          <div className="flex items-start justify-between px-4 pt-3 pb-2">
            <div>
              <p className="text-muted-foreground mb-0.5 text-[10px] font-medium tracking-widest uppercase">
                Spot
              </p>
              <p className="text-2xl leading-none font-bold tracking-tight">
                #{spot.number}
              </p>
              {spot.label && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {spot.label}
                </p>
              )}
            </div>
            <span
              className={`mt-1 text-xs font-semibold ${STATUS_TEXT[spot.status]}`}
            >
              {STATUS_LABELS[spot.status]}
            </span>
          </div>

          {/* Divider + owner row */}
          <div className="border-t px-4 py-2.5">
            <div className="flex items-start gap-2">
              <User className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0">
                {spot.owner_name ? (
                  spot.owner_name.split('/').map((name) => (
                    <p key={name} className="text-muted-foreground text-xs">
                      {name.trim()}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    Unassigned
                  </p>
                )}
                {spot.status === 'reserved' &&
                  spot.active_booking_reserved_by &&
                  spot.active_booking_reserved_by !== spot.owner_name && (
                    <p className="text-spot-reserved mt-0.5 flex items-center gap-1 text-xs">
                      <Clock className="size-3 shrink-0" />
                      {spot.active_booking_reserved_by}
                    </p>
                  )}
                {spot.status === 'reserved' &&
                  spot.active_booking_expires_at && (
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      <Clock className="size-3 shrink-0" />
                      <ReservationTimer
                        expiresAt={spot.active_booking_expires_at}
                      />
                    </p>
                  )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
