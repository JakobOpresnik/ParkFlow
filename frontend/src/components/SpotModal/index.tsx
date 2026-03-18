import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot } from '@/types'

import { BookingCta } from './BookingCta'
import { DetailsCard } from './DetailsCard'
import { ManagementAccordion } from './ManagementAccordion'
import { StatusBanner } from './StatusBanner'

// — helpers —

type TFunc = (key: string, opts?: Record<string, unknown>) => string

function buildBannerSubtext(
  spot: Spot,
  myReservedElsewhere: Spot | undefined,
  canCancelThisBooking: boolean,
  isCurrentUserOwner: boolean,
  t: TFunc,
): string {
  if (spot.status === 'free') {
    return myReservedElsewhere
      ? t('spotModal.bannerFreeElsewhere', {
          number: myReservedElsewhere.number,
        })
      : t('spotModal.bannerFree')
  }
  if (spot.status === 'reserved') {
    return canCancelThisBooking
      ? t('spotModal.bannerReservedMine')
      : t('spotModal.bannerReservedOther')
  }
  if (isCurrentUserOwner && spot.status === 'occupied')
    return t('spotModal.bannerOccupiedMine')
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

  const isCurrentUserOwner =
    !!user && !!spot && spot.owner_user_id === user.username

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
          s.active_booking_expires_at?.slice(0, 10) === selectedDate,
      )
    : undefined

  // Whether the logged-in user (or admin) can cancel this spot's active booking.
  // Must also verify the booking is for the selected date — stale booking data
  // from a different day can appear on the spot when viewing future/past dates.
  const canCancelThisBooking =
    !!spot.active_booking_id &&
    !!user &&
    (spot.active_booking_user_id === user.id || user.role === 'admin') &&
    spot.active_booking_expires_at?.slice(0, 10) === selectedDate

  const bannerSubtext = buildBannerSubtext(
    spot,
    myReservedElsewhere,
    canCancelThisBooking,
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
        <div className="px-6 pt-6 pr-14 pb-5">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            {t('spotModal.parkingSpot')}
          </p>
          <div className="min-w-0">
            <h2 className="text-3xl font-bold tracking-tight">
              #{spot.number}
            </h2>
            {spot.label && (
              <p className="text-muted-foreground mt-0.5 truncate text-sm">
                {spot.label}
              </p>
            )}
          </div>
        </div>

        <div className="bg-border h-px" />

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="max-h-[80vh] space-y-4 overflow-y-auto px-6 py-5">
          <StatusBanner
            status={spot.status}
            subtext={bannerSubtext}
            titleOverride={
              isCurrentUserOwner && spot.status === 'occupied'
                ? t('spotModal.yourSpot')
                : undefined
            }
          />
          <DetailsCard spot={spot} isCurrentUserOwner={isCurrentUserOwner} />

          {/* Management accordion (logged-in users) */}
          {user && <ManagementAccordion spot={spot} />}

          <div className="bg-border -mx-6 h-px" />

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
