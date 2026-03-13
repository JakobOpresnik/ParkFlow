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

function buildBannerSubtext(
  spot: Spot,
  myReservedElsewhere: Spot | undefined,
  canCancelThisBooking: boolean,
): string {
  if (spot.status === 'free') {
    return myReservedElsewhere
      ? `You have spot #${myReservedElsewhere.number} reserved. Moving here will cancel it.`
      : 'This spot is open and ready to reserve.'
  }
  if (spot.status === 'reserved') {
    return canCancelThisBooking
      ? 'You have reserved this spot.'
      : 'This spot has already been reserved.'
  }
  return spot.owner_name
    ? 'This spot is currently in use by the owner.'
    : 'This spot is currently in use.'
}

// — main component —

export function SpotModal() {
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

  // Whether the logged-in user (or admin) can cancel this spot's active booking
  const canCancelThisBooking =
    !!spot.active_booking_id &&
    !!user &&
    (spot.active_booking_user_id === user.id || user.role === 'admin')

  const bannerSubtext = buildBannerSubtext(
    spot,
    myReservedElsewhere,
    canCancelThisBooking,
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
            Parking Spot
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
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          <StatusBanner status={spot.status} subtext={bannerSubtext} />
          <DetailsCard spot={spot} />

          {/* Management accordion (logged-in users) */}
          {user && <ManagementAccordion spot={spot} />}

          <div className="bg-border -mx-6 h-px" />

          {/* ── CTA ─────────────────────────────────────────────── */}
          <BookingCta
            spot={spot}
            user={user}
            selectedDate={selectedDate}
            arrivalTime={arrivalTime}
            reservationDuration={reservationDuration}
            myReservedElsewhere={myReservedElsewhere}
            canCancelThisBooking={canCancelThisBooking}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
