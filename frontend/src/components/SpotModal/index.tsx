import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { hasRealOwner } from '@/lib/spots'
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

// Names whoever is actually occupying/holding the spot, for viewers who are
// neither the booker nor an owner. Priority:
//   1. An active booking → the real reserver (owner or a coworker who booked
//      while the owner was away) — most authoritative, always a real person.
//   2. No booking, but presence data confirms the real owner is in office —
//      genuinely in use, just not via a formal reservation.
//   3. Neither → an admin flagged the spot directly with nothing behind it;
//      there is no one to name.
// Guests never reach branch 1 or the named half of branch 2: the backend
// scrubs active_booking_reserved_by, and the hook nulls in_office_owner, for
// guest requests — they naturally fall through to the generic owner text.
function resolveOccupantSubtext(spot: Spot, t: TFunc): string {
  if (spot.active_booking_reserved_by) {
    return t('spotModal.reservedBy', {
      name: spot.active_booking_reserved_by,
    })
  }
  if (hasRealOwner(spot.owner_name)) {
    return spot.in_office_owner
      ? t('spotModal.reservedBy', { name: spot.in_office_owner })
      : t('spotModal.bannerOccupiedOwner')
  }
  return t('spotModal.bannerUnavailable')
}

function buildBannerSubtext(
  spot: Spot,
  myReservedElsewhere: Spot | undefined,
  isMyBooking: boolean,
  isCurrentUserOwner: boolean,
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
    return resolveOccupantSubtext(spot, t)
  }
  if (spot.status === 'spotted') {
    return spot.spotted_reported_at
      ? t('spotModal.bannerSpottedRelative', {
          when: formatRelativeMinutes(spot.spotted_reported_at, t),
        })
      : t('spotModal.bannerSpotted')
  }
  if (isCurrentUserOwner && spot.status === 'occupied') {
    return t('spotModal.bannerOccupiedMine')
  }
  return resolveOccupantSubtext(spot, t)
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

  // The owner is whoever matches EITHER signal: the admin-linked SSO username, or
  // the display name. The name fallback is required because owner_user_id is
  // admin-populated and sometimes missing — without it that owner would lose
  // access to their own spot.
  const isCurrentUserOwner =
    !!user &&
    (spot.owner_user_id?.trim() === user.username ||
      spot.owner_name?.trim().toLowerCase() === user.displayName.toLowerCase())

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

  const isGuest = user?.role === 'guest'

  // An admin-forced 'reserved' has no booking — surface the admin recorded in
  // status_set_by as the reserver, same as a real booking's reserved_by.
  const bannerSubtext = buildBannerSubtext(
    {
      ...spot,
      status: bannerStatus,
      active_booking_reserved_by:
        spot.active_booking_reserved_by ??
        (spot.status === 'reserved' ? spot.status_set_by : null),
    },
    myReservedElsewhere,
    isMyBooking,
    isCurrentUserOwner,
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
              isCurrentUserOwner && bannerStatus === 'occupied'
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
            myOwnedSpot={myOwnedSpot}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
