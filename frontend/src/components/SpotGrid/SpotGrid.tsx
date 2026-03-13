import { Accessibility, Clock, User, Zap } from 'lucide-react'

import { ReservationTimer } from '@/components/ReservationTimer'
import { useParkingStore } from '@/store/parkingStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot, SpotStatus } from '@/types'

// — types —

interface StatusConfigDetails {
  accent: string
  badgeText: string
  badgeBg: string
  label: string
}

interface ClockRowProps {
  readonly children: React.ReactNode
  readonly className?: string
}

interface OwnerListProps {
  readonly spot: Spot
}

interface SpotCardProps {
  readonly spot: Spot
  readonly onClick: () => void
}

interface SpotGridProps {
  readonly spots: Spot[]
}

// — constants —

const STATUS_CONFIG: Record<SpotStatus, StatusConfigDetails> = {
  free: {
    accent: 'bg-spot-free',
    badgeText: 'text-spot-free',
    badgeBg: 'bg-spot-free/15',
    label: 'Free',
  },
  occupied: {
    accent: 'bg-spot-occupied',
    badgeText: 'text-spot-occupied',
    badgeBg: 'bg-spot-occupied/15',
    label: 'Occupied',
  },
  reserved: {
    accent: 'bg-spot-reserved',
    badgeText: 'text-spot-reserved',
    badgeBg: 'bg-spot-reserved/15',
    label: 'Reserved',
  },
}

// — sub-components —

function ClockRow({ children, className }: ClockRowProps) {
  return (
    <p className={`mt-0.5 flex items-center gap-1 text-xs ${className ?? ''}`}>
      <Clock className="size-3 shrink-0" />
      {children}
    </p>
  )
}

function OwnerList({ spot }: OwnerListProps) {
  const isReservedByOther =
    spot.status === 'reserved' &&
    spot.active_booking_reserved_by &&
    spot.active_booking_reserved_by !== spot.owner_name

  const isBookingExpiring =
    spot.status === 'reserved' && spot.active_booking_expires_at

  return (
    <div className="min-w-0">
      {spot.owner_name ? (
        spot.owner_name.split('/').map((name: string) => {
          const isInOffice =
            spot.in_office_owner?.toLowerCase() === name.trim().toLowerCase()

          return (
            <p
              key={name}
              className={`text-xs ${isInOffice ? 'text-spot-occupied font-medium' : 'text-muted-foreground'}`}
            >
              {name.trim()}
              {isInOffice && (
                <span className="ml-1 opacity-70">· in office</span>
              )}
            </p>
          )
        })
      ) : (
        <p className="text-muted-foreground text-xs italic">Unassigned</p>
      )}

      {isReservedByOther && (
        <ClockRow className="text-spot-reserved">
          {spot.active_booking_reserved_by}
        </ClockRow>
      )}

      {isBookingExpiring && (
        <ClockRow className="text-muted-foreground">
          <ReservationTimer expiresAt={spot.active_booking_expires_at!} />
        </ClockRow>
      )}
    </div>
  )
}

function SpotCard({ spot, onClick }: SpotCardProps) {
  const config = STATUS_CONFIG[spot.status]

  return (
    <button
      onClick={onClick}
      aria-label={`Spot ${spot.number}`}
      className="bg-card group relative cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Colored top accent strip */}
      <div className={`absolute inset-x-0 top-0 h-1 ${config.accent}`} />

      {/* Header: number + status */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div>
          <div className="mb-0.5 flex items-center gap-1.5">
            <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              Spot
            </p>
            {spot.type === 'ev' && <Zap className="size-3 text-yellow-500" />}
            {spot.type === 'handicap' && (
              <Accessibility className="size-3 text-blue-500" />
            )}
          </div>
          <p className="text-2xl leading-none font-bold tracking-tight">
            #{spot.number}
          </p>
          {spot.label && (
            <p className="text-muted-foreground mt-0.5 text-xs">{spot.label}</p>
          )}
        </div>
        <span
          className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${config.badgeText} ${config.badgeBg}`}
        >
          {config.label}
        </span>
      </div>

      {/* Divider + owner row */}
      <div className="border-t px-4 py-2.5">
        <div className="flex items-start gap-2">
          <User className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          <OwnerList spot={spot} />
        </div>
      </div>
    </button>
  )
}

// — main component —

export function SpotGrid({ spots }: SpotGridProps) {
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const setSpotModalOpen = useUIStore((s) => s.setSpotModalOpen)

  function handleClick(spot: Spot) {
    setSelectedSpot(spot)
    setSpotModalOpen(true)
  }

  if (spots.length === 0) {
    return <p className="text-muted-foreground text-sm">No spots found.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {spots.map((spot: Spot) => (
        <SpotCard key={spot.id} spot={spot} onClick={() => handleClick(spot)} />
      ))}
    </div>
  )
}
