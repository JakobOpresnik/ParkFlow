import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot } from '@/types'

import { BookingCta } from './BookingCta'
import { ClearSpottedAction } from './ClearSpottedAction'
import { DetailsCard } from './DetailsCard'
import { ManagementAccordion } from './ManagementAccordion'
import { StatusBanner } from './StatusBanner'

// — helpers —

type TFunc = (key: string, opts?: Record<string, unknown>) => string

function formatRelativeMinutes(iso: string, t: TFunc): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return t('spotModal.justNow')
  if (minutes < 60) return t('spotModal.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  return t('spotModal.hoursAgo', { count: hours })
}

function buildBannerSubtext(
  spot: Spot,
  myReservedElsewhere: Spot | undefined,
  isMyBooking: boolean,
  isCurrentUserOwner: boolean,
  isCoOwnerBooking: boolean,
  isSharedSpot: boolean,
  isCurrentUserInOffice: boolean,
  isGuest: boolean,
  t: TFunc,
): string {
  if (spot.status === 'free') {
    return myReservedElsewhere
      ? t('spotModal.bannerFreeElsewhere', {
          label: myReservedElsewhere.label ?? `#${myReservedElsewhere.number}`,
        })
      : t('spotModal.bannerFree')
  }
  if (spot.status === 'reserved') {
    if (isMyBooking) return t('spotModal.bannerReservedMine')
    if (isCoOwnerBooking) return t('spotModal.bannerReservedByCoOwner')
    return t('spotModal.bannerReservedOther')
  }
  if (spot.status === 'unconfirmed') {
    if (isGuest) return t('spotModal.bannerUnconfirmed')
    const names = (spot.possible_occupiers ?? []).join(', ')
    return names
      ? t('spotModal.bannerUnconfirmedNamed', { names })
      : t('spotModal.bannerUnconfirmed')
  }
  if (spot.status === 'spotted') {
    return spot.spotted_reported_at
      ? t('spotModal.bannerSpottedRelative', {
          when: formatRelativeMinutes(spot.spotted_reported_at, t),
        })
      : t('spotModal.bannerSpotted')
  }
  if (isCurrentUserOwner && spot.status === 'occupied') {
    if (isSharedSpot)
      return isCurrentUserInOffice
        ? t('spotModal.bannerOccupiedSharedByMe')
        : t('spotModal.bannerOccupiedSharedByCoOwner')
    return t('spotModal.bannerOccupiedMine')
  }
  return spot.owner_name
    ? t('spotModal.bannerOccupiedOwner')
    : t('spotModal.bannerOccupied')
}

// — main component —

export function SpotModal() {
  const { t } = useTranslation()
  const open = useUIStore((s) => s.spotModalOpen)
  const setOpen = useUIStore((s) => s.setSpotModalOpen)
  const selectedSpot = useParkingStore((s) => s.selectedSpot)
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const selectedDate = useUIStore((s) => s.selectedDate)

  const { data: allSpots = [] } = useEffectiveSpots(selectedDate)
  const spot = allSpots.find((s) => s.id === selectedSpot?.id) ?? selectedSpot

  const user = useAuthStore((s) => s.user)
  const arrivalTime = usePrefsStore((s) => s.arrivalTime)
  const reservationDuration = usePrefsStore((s) => s.reservationDuration)

  function handleClose() {
    setOpen(false)
    setSelectedSpot(null)
  }

  if (!spot) return null

  // A user counts as a co-owner if EITHER signal matches:
  //   - owner_user_id (admin-linked SSO usernames, comma-separated) contains user.username
  //   - owner_name (canonical "Name1 / Name2 / ...") contains user.displayName
  // The displayName fallback is required because owner_user_id is admin-populated
  // and often incomplete for shared spots — without it, co-owners whose username
  // wasn't linked lose access to PP / unconfirmed reservation flows.
  const isCurrentUserOwner =
    !!user &&
    ((!!spot?.owner_user_id &&
      spot.owner_user_id
        .split(',')
        .map((u) => u.trim())
        .includes(user.username)) ||
      (!!spot?.owner_name &&
        spot.owner_name
          .split('/')
          .map((n) => n.trim().toLowerCase())
          .includes(user.displayName.toLowerCase())))

  const isSharedSpot =
    (spot.owner_name?.includes('/') ?? false) ||
    (spot.owner_user_id?.includes(',') ?? false)

  const myOwnedSpot = user
    ? allSpots.find(
        (s) => s.owner_user_id === user.username && s.id !== spot.id,
      )
    : undefined

  // Spot the current user has reserved elsewhere ON THE SAME DAY (for auto-cancel on new reserve).
  // Reservations on other days are independent and must not be affected.
  const myReservedElsewhere = user
    ? allSpots.find(
        (s) =>
          s.active_booking_user_id === user.id &&
          s.active_booking_id !== null &&
          s.id !== spot.id &&
          s.active_booking_date === selectedDate,
      )
    : undefined

  // Whether the current user actually made this booking (not just can cancel as admin).
  const isMyBooking =
    !!spot.active_booking_id &&
    !!user &&
    spot.active_booking_user_id === user.id &&
    spot.active_booking_date === selectedDate

  // Whether the active booking was made by a co-owner (not the current user).
  // Used to show context and suppress cancel for the other co-owner.
  const isCoOwnerBooking =
    isCurrentUserOwner &&
    !isMyBooking &&
    spot.status === 'reserved' &&
    !!spot.active_booking_booked_by_owner

  // Whether the logged-in user (or admin) can cancel this spot's active booking.
  // Must also verify the booking is for the selected date — stale booking data
  // from a different day can appear on the spot when viewing future/past dates.
  const canCancelThisBooking =
    !!spot.active_booking_id &&
    !!user &&
    (spot.active_booking_user_id === user.id || user.role === 'admin') &&
    spot.active_booking_date === selectedDate

  // Show reserved (yellow) for the user's own booking or the owner's own spot.
  // Someone else's reservation should display as occupied (red).
  const bannerStatus =
    spot.status === 'reserved' && !isMyBooking && !isCurrentUserOwner
      ? 'occupied'
      : spot.status

  const isCurrentUserInOffice =
    isCurrentUserOwner &&
    !!spot.in_office_owner &&
    !!user &&
    spot.in_office_owner.toLowerCase() === user.displayName.toLowerCase()

  // Any co-owner of an unconfirmed shared spot can finalize the reservation,
  // including co-owners who set PP=true. The unconfirmed state only resolves
  // into 'occupied' when exactly one co-owner has PP=false; until then, any
  // co-owner clicking Reserve converts the ambiguous state into a concrete booking.
  const isCurrentUserCoOwnerOnUnconfirmed =
    isCurrentUserOwner && spot.status === 'unconfirmed'

  const isGuest = user?.role === 'guest'

  const bannerSubtext = buildBannerSubtext(
    { ...spot, status: bannerStatus },
    myReservedElsewhere,
    isMyBooking,
    isCurrentUserOwner,
    isCoOwnerBooking,
    isSharedSpot,
    isCurrentUserInOffice,
    isGuest,
    t as TFunc,
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md sm:p-0">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-4 pt-4 pr-12 pb-4 sm:px-6 sm:pt-6 sm:pr-14 sm:pb-5">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            {t('spotModal.parkingSpot')}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {spot.label ?? `#${spot.number}`}
            </h2>
            {isGuest && (
              <span
                title={t('spotModal.guestViewHintTooltip')}
                className="text-muted-foreground bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              >
                <EyeOff className="size-3" />
                {t('spotModal.guestViewHint')}
              </span>
            )}
          </div>
        </div>

        <div className="bg-border h-px" />

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="max-h-[75vh] space-y-4 overflow-y-auto px-4 py-4 sm:max-h-[80vh] sm:px-6 sm:py-5">
          <StatusBanner
            status={bannerStatus}
            subtext={bannerSubtext}
            titleOverride={
              isCurrentUserOwner && !isSharedSpot && bannerStatus === 'occupied'
                ? t('spotModal.yourSpot')
                : undefined
            }
            action={
              bannerStatus === 'spotted' && !!user && user.role !== 'guest' ? (
                <ClearSpottedAction
                  spotId={spot.id}
                  spotLabel={spot.label ?? `#${spot.number}`}
                />
              ) : undefined
            }
          />
          <DetailsCard
            spot={spot}
            currentUserDisplayName={user?.displayName}
            isGuest={isGuest}
          />

          {/* Management accordion (admins only) */}
          {user?.role === 'admin' && <ManagementAccordion spot={spot} />}

          <div className="bg-border -mx-4 h-px sm:-mx-6" />

          {/* ── CTA ─────────────────────────────────────────────── */}
          {/* key resets ownerWarningOpen / bookingDuration / interval state on spot change */}
          <BookingCta
            key={spot.id}
            spot={spot}
            user={user}
            selectedDate={selectedDate}
            arrivalTime={arrivalTime}
            reservationDuration={reservationDuration}
            myReservedElsewhere={myReservedElsewhere}
            canCancelThisBooking={canCancelThisBooking}
            isCoOwnerBooking={isCoOwnerBooking}
            isCurrentUserCoOwnerOnUnconfirmed={
              isCurrentUserCoOwnerOnUnconfirmed
            }
            myOwnedSpot={myOwnedSpot}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
