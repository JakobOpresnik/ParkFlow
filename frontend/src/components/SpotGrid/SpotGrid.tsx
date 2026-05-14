import { Accessibility, Car, Clock, Crown, User, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ReservationTimer } from '@/components/ReservationTimer'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot, SpotStatus } from '@/types'

// — types —

interface StatusConfigDetails {
  readonly accent: string
  readonly badgeText: string
  readonly badgeBg: string
}

interface ClockRowProps {
  readonly children: React.ReactNode
  readonly className?: string
}

interface OwnerListProps {
  readonly spot: Spot
  readonly isMySpot: boolean
  readonly ownerVehiclePlate: string | null
}

interface SpotCardProps {
  readonly spot: Spot
  readonly onClick: () => void
}

interface SpotGridProps {
  readonly spots: Spot[]
}

// — constants —

const STATUS_LABEL_KEYS: Record<SpotStatus, string> = {
  free: 'map.free',
  occupied: 'map.occupied',
  reserved: 'map.reserved',
  unconfirmed: 'map.unconfirmed',
  spotted: 'map.spotted',
}

const STATUS_CONFIG: Record<SpotStatus, StatusConfigDetails> = {
  free: {
    accent: 'bg-spot-free',
    badgeText: 'text-spot-free',
    badgeBg: 'bg-spot-free/15',
  },
  occupied: {
    accent: 'bg-spot-occupied',
    badgeText: 'text-spot-occupied',
    badgeBg: 'bg-spot-occupied/15',
  },
  reserved: {
    accent: 'bg-spot-reserved',
    badgeText: 'text-spot-reserved',
    badgeBg: 'bg-spot-reserved/15',
  },
  unconfirmed: {
    accent: 'bg-spot-unconfirmed',
    badgeText: 'text-spot-unconfirmed',
    badgeBg: 'bg-spot-unconfirmed/15',
  },
  spotted: {
    accent: 'bg-spot-spotted',
    badgeText: 'text-spot-spotted',
    badgeBg: 'bg-spot-spotted/15',
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

function OwnerNameRows({ spot }: { readonly spot: Spot }) {
  const { t } = useTranslation()
  if (!spot.owner_name) {
    return (
      <p className="text-muted-foreground text-xs italic">
        {t('spotModal.unassigned')}
      </p>
    )
  }

  const possibleSet = new Set(
    (spot.possible_occupiers ?? []).map((n) => n.toLowerCase()),
  )
  const isUnconfirmed = spot.status === 'unconfirmed' && possibleSet.size > 0

  return (
    <>
      {spot.owner_name.split('/').map((name: string) => {
        const trimmed = name.trim()
        const lower = trimmed.toLowerCase()
        const isInOffice = spot.in_office_owner?.toLowerCase() === lower
        const isPossible = isUnconfirmed && possibleSet.has(lower)

        const textClass = isInOffice
          ? 'text-spot-occupied font-medium'
          : isPossible
            ? 'text-spot-unconfirmed font-medium'
            : 'text-muted-foreground'

        return (
          <p key={name} className={`text-xs ${textClass}`}>
            {trimmed}
            {isInOffice && (
              <span className="ml-1 opacity-70">
                · {t('spotModal.inOffice')}
              </span>
            )}
            {isPossible && (
              <span className="ml-1 opacity-70">
                · {t('spotModal.maybeInOffice')}
              </span>
            )}
          </p>
        )
      })}
    </>
  )
}

function OwnerList({ spot, isMySpot, ownerVehiclePlate }: OwnerListProps) {
  const { t } = useTranslation()
  const isReservedByOther =
    spot.status === 'reserved' &&
    spot.active_booking_reserved_by &&
    spot.active_booking_reserved_by !== spot.owner_name

  const isBookingExpiring =
    spot.status === 'reserved' && spot.active_booking_expires_at

  return (
    <div className="min-w-0">
      {isMySpot ? (
        <>
          <p className="text-spot-reserved text-xs font-medium">
            {t('spotModal.you')}
          </p>
          {ownerVehiclePlate && (
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              <Car className="size-3 shrink-0" />
              {ownerVehiclePlate}
            </p>
          )}
        </>
      ) : (
        <OwnerNameRows spot={spot} />
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
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)

  const isMySpot = !!currentUser && spot.owner_user_id === currentUser.username
  const isMyBooking =
    !!currentUser && spot.active_booking_user_id === currentUser.id
  // Own spot occupied via presence or override (no booking) → show as reserved (yellow)
  const isMyOwnOccupation =
    isMySpot &&
    (spot.status === 'occupied' ||
      (spot.status === 'reserved' && spot.active_booking_id == null))
  const displayStatus: SpotStatus = isMyOwnOccupation
    ? 'reserved'
    : spot.status === 'reserved' && !isMyBooking
      ? 'occupied'
      : spot.status
  const config = STATUS_CONFIG[displayStatus]

  const badgeLabel =
    isMySpot && displayStatus === 'reserved'
      ? t('spotModal.yourSpot')
      : t(STATUS_LABEL_KEYS[displayStatus])

  return (
    <button
      onClick={onClick}
      aria-label={`Spot ${spot.label ?? spot.number}`}
      className="bg-card group relative cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Colored top accent strip */}
      <div className={`absolute inset-x-0 top-0 h-1 ${config.accent}`} />

      {/* Header: number + status */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div>
          <div className="mb-0.5 flex items-center gap-1.5">
            <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              {t('map.spotLabel')}
            </p>
            {spot.type === 'ev' && <Zap className="size-3 text-yellow-500" />}
            {spot.type === 'handicap' && (
              <Accessibility className="size-3 text-blue-500" />
            )}
          </div>
          <p className="text-2xl leading-none font-bold tracking-tight">
            {spot.label ?? `#${spot.number}`}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1">
          {isMySpot && <Crown className="text-primary size-3 shrink-0" />}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.badgeText} ${config.badgeBg}`}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      {/* Divider + owner row */}
      <div className="border-t px-4 py-2.5">
        <div className="flex items-start gap-2">
          <User className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          <OwnerList
            spot={spot}
            isMySpot={isMySpot}
            ownerVehiclePlate={spot.owner_vehicle_plate}
          />
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

  const { t } = useTranslation()

  if (spots.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t('map.noSpotsFound')}</p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {spots.map((spot: Spot) => (
        <SpotCard key={spot.id} spot={spot} onClick={() => handleClick(spot)} />
      ))}
    </div>
  )
}
