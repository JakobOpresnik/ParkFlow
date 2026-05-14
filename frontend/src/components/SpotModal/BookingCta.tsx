import { Tooltip } from '@mantine/core'
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Lock,
  Pencil,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ReservationTimer } from '@/components/ReservationTimer'
import { Button } from '@/components/ui/button'
import type { Spot } from '@/types'

import { DurationPicker } from './DurationPicker'
import { IntervalEditor } from './IntervalEditor'
import { useBookingCta } from './useBookingCta'
import { useIntervalEditor } from './useIntervalEditor'
import { fmtTime } from './utils'

// — types —

interface BookingCtaProps {
  readonly spot: Spot
  readonly user: { id: string; role: string } | null
  readonly selectedDate: string
  readonly arrivalTime: string
  readonly reservationDuration: number
  readonly myReservedElsewhere: Spot | undefined
  readonly canCancelThisBooking: boolean
  readonly isCoOwnerBooking: boolean
  readonly isCurrentUserCoOwnerOnUnconfirmed: boolean
  readonly myOwnedSpot?: Spot
}

// — constants —

const STRETCH_BUTTON_STYLE = {
  display: 'flex',
  justifySelf: 'stretch',
} as const

// — main component —

export function BookingCta({
  spot,
  user,
  selectedDate,
  arrivalTime,
  reservationDuration,
  myReservedElsewhere,
  canCancelThisBooking,
  isCoOwnerBooking,
  isCurrentUserCoOwnerOnUnconfirmed,
  myOwnedSpot,
}: BookingCtaProps) {
  const { t } = useTranslation()
  const {
    bookingDuration,
    setBookingDuration,
    isBookableDate,
    computedExpiryStr,
    arrivalWindowPassed,
    bookingPending,
    unavailableMsg,
    handleBook,
    handleCancelBooking,
    ownerWarningOpen,
    setOwnerWarningOpen,
    spottedConfirmOpen,
    setSpottedConfirmOpen,
    handleReportSpotted,
    handleClearSpotted,
    reportSpottedPending,
    clearSpottedPending,
  } = useBookingCta(spot, {
    selectedDate,
    arrivalTime,
    reservationDuration,
    myReservedElsewhere,
    myOwnedSpot,
  })

  const {
    editingInterval,
    setEditingInterval,
    editStart,
    setEditStart,
    editEnd,
    setEditEnd,
    updateBookingTimesPending,
    handleOpenIntervalEdit,
    handleSaveInterval,
  } = useIntervalEditor(spot, arrivalTime)

  const isGuest = user?.role === 'guest'
  // Any co-owner of an unconfirmed shared spot can reserve it — including
  // co-owners with PP=true — which converts the ambiguous state into a
  // concrete reservation. Once the spot is 'occupied' (single PP=false owner),
  // no co-owner can reserve it anymore.
  const isSpotted = spot.status === 'spotted'
  const isReservableForUser =
    spot.status === 'free' || isSpotted || isCurrentUserCoOwnerOnUnconfirmed
  const canReserveNow =
    isReservableForUser &&
    !!user &&
    !isGuest &&
    isBookableDate &&
    !arrivalWindowPassed
  const freeWindowExpired =
    isReservableForUser &&
    !!user &&
    !isGuest &&
    isBookableDate &&
    arrivalWindowPassed
  const guestCannotReserve =
    (spot.status === 'free' || isSpotted) && isGuest && isBookableDate
  const freeButUnavailable =
    isReservableForUser && !guestCannotReserve && (!user || !isBookableDate)
  const isUnavailableSpot =
    spot.status === 'occupied' ||
    (spot.status === 'unconfirmed' && !isCurrentUserCoOwnerOnUnconfirmed) ||
    (spot.status === 'reserved' && !canCancelThisBooking)
  // Anyone authenticated (not guest) may report or clear on a free/spotted spot.
  const canReportSpotted =
    spot.status === 'free' && !!user && !isGuest && isBookableDate
  const canClearSpotted = isSpotted && !!user && !isGuest

  return (
    <>
      {/* Free spot: reserve (or move reservation here) — today or future only */}
      {canReserveNow && (
        <div className="space-y-3">
          <DurationPicker
            duration={bookingDuration}
            onChange={setBookingDuration}
            arrivalTime={arrivalTime}
            expiryStr={computedExpiryStr}
          />
          {spottedConfirmOpen ? (
            <div className="space-y-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
                <AlertTriangle className="size-4 shrink-0" />
                {t('spotModal.spottedConfirmTitle')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('spotModal.spottedConfirmDesc')}
              </p>
              <div className="flex gap-2">
                <Button
                  className="h-9 flex-1 gap-2 text-sm font-semibold"
                  disabled={bookingPending}
                  onClick={handleBook}
                >
                  <CalendarCheck className="size-4" />
                  {t('spotModal.spottedConfirmReserveAnyway')}
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-sm"
                  onClick={() => setSpottedConfirmOpen(false)}
                >
                  {t('spotModal.cancelButton')}
                </Button>
              </div>
            </div>
          ) : ownerWarningOpen ? (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {t('spotModal.ownerWarningTitle', {
                  label: myOwnedSpot?.label ?? `#${myOwnedSpot?.number}`,
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('spotModal.ownerWarningDesc', {
                  label: myOwnedSpot?.label ?? `#${myOwnedSpot?.number}`,
                  spotLabel: spot.label ?? `#${spot.number}`,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  className="h-9 flex-1 gap-2 text-sm font-semibold"
                  disabled={bookingPending}
                  onClick={handleBook}
                >
                  <CalendarCheck className="size-4" />
                  {t('spotModal.reserveSpotNumber', {
                    label: spot.label ?? `#${spot.number}`,
                  })}
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-sm"
                  onClick={() => setOwnerWarningOpen(false)}
                >
                  {t('spotModal.cancelButton')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="h-11 w-full gap-2 text-[15px] font-semibold"
              style={STRETCH_BUTTON_STYLE}
              disabled={bookingPending}
              onClick={handleBook}
            >
              {myReservedElsewhere ? (
                <>
                  <ArrowRightLeft className="size-5" />
                  {t('spotModal.moveToThisSpot')}
                </>
              ) : (
                <>
                  <CalendarCheck className="size-5" />
                  {t('spotModal.reserveParkingSpot')}
                </>
              )}
            </Button>
          )}
          {!ownerWarningOpen && !spottedConfirmOpen && myReservedElsewhere && (
            <p className="text-muted-foreground text-center text-xs">
              {t('spotModal.spotReservationWillBeCancelled', {
                label:
                  myReservedElsewhere.label ?? `#${myReservedElsewhere.number}`,
              })}
            </p>
          )}
        </div>
      )}

      {/* Free spot: secondary action — report a car parked here */}
      {canReportSpotted && !ownerWarningOpen && (
        <Button
          variant="ghost"
          className="text-muted-foreground h-9 w-full gap-2 text-xs font-medium hover:text-orange-600 dark:hover:text-orange-400"
          disabled={reportSpottedPending}
          onClick={handleReportSpotted}
        >
          <AlertTriangle className="size-3.5" />
          {t('spotModal.reportSpotted')}
        </Button>
      )}

      {/* Spotted spot: secondary action — clear the report */}
      {canClearSpotted && !spottedConfirmOpen && (
        <Button
          variant="ghost"
          className="text-muted-foreground h-9 w-full gap-2 text-xs font-medium hover:text-emerald-600 dark:hover:text-emerald-400"
          disabled={clearSpottedPending}
          onClick={handleClearSpotted}
        >
          <CheckCircle2 className="size-3.5" />
          {t('spotModal.clearSpotted')}
        </Button>
      )}

      {/* Guest: show disabled reserve button + tooltip prompting sign-in */}
      {guestCannotReserve && (
        <Tooltip
          label={t('spotModal.signInToReserve')}
          position="top"
          withArrow
          events={{ hover: true, focus: true, touch: true }}
        >
          <span className="block">
            <Button
              className="h-11 w-full gap-2 text-[15px] font-semibold"
              style={STRETCH_BUTTON_STYLE}
              disabled
            >
              <CalendarCheck className="size-5" />
              {t('spotModal.reserveParkingSpot')}
            </Button>
          </span>
        </Tooltip>
      )}

      {/* Free spot: arrival window passed for today */}
      {freeWindowExpired && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
          <Lock className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground text-sm">
            {t('spotModal.reservationWindowEnded', {
              time: arrivalTime,
              expiry: computedExpiryStr,
            })}
          </p>
        </div>
      )}

      {/* Free spot, not logged in or past date */}
      {freeButUnavailable && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
          <Lock className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground text-sm">
            {!isBookableDate
              ? t('spotModal.cannotReservePast')
              : t('spotModal.signInToReserve')}
          </p>
        </div>
      )}

      {/* Reserved — user can cancel or edit interval */}
      {spot.status === 'reserved' && canCancelThisBooking && (
        <div className="space-y-3">
          {spot.active_booking_expires_at && !editingInterval && (
            <button
              onClick={handleOpenIntervalEdit}
              className="text-muted-foreground hover:bg-muted/50 group justify-space-between flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-2 text-sm transition-colors"
            >
              <>
                <Clock className="mr-0.5 size-3.5 shrink-0" />
                <ReservationTimer
                  expiresAt={spot.active_booking_expires_at}
                  arrivalTime={
                    spot.active_booking_starts_at
                      ? fmtTime(new Date(spot.active_booking_starts_at))
                      : arrivalTime
                  }
                />
              </>
              <Pencil className="ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}

          {editingInterval && (
            <IntervalEditor
              editStart={editStart}
              editEnd={editEnd}
              onChangeStart={setEditStart}
              onChangeEnd={setEditEnd}
              onSave={handleSaveInterval}
              onCancel={() => setEditingInterval(false)}
              isPending={updateBookingTimesPending}
            />
          )}

          <Button
            variant="outline"
            className="text-destructive border-destructive/25 hover:bg-destructive/5 hover:text-destructive h-11 w-full gap-2 text-[15px] font-semibold"
            style={STRETCH_BUTTON_STYLE}
            disabled={bookingPending || updateBookingTimesPending}
            onClick={handleCancelBooking}
          >
            <X className="size-5" />
            {t('spotModal.cancelReservation')}
          </Button>
        </div>
      )}

      {/* Occupied, or reserved by someone else */}
      {isUnavailableSpot && (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-3 text-sm">
          {isCoOwnerBooking && spot.active_booking_reserved_by && (
            <span className="text-foreground text-xs font-medium">
              {spot.active_booking_reserved_by}
            </span>
          )}
          {spot.active_booking_expires_at?.slice(0, 10) === selectedDate ? (
            <>
              <Clock className="size-4" />
              <ReservationTimer
                expiresAt={spot.active_booking_expires_at}
                arrivalTime={
                  spot.active_booking_starts_at
                    ? fmtTime(new Date(spot.active_booking_starts_at))
                    : arrivalTime
                }
              />
            </>
          ) : spot.status === 'occupied' ? (
            <div className="flex items-center gap-1.5">
              <Clock className="size-4" />
              <span>
                {t('spotModal.occupiedHours', {
                  start: '09:00',
                  end: '17:00',
                })}
              </span>
            </div>
          ) : spot.status === 'unconfirmed' ? (
            <span className="px-3 text-center text-xs leading-snug">
              {t('spotModal.spotUnavailableUnconfirmed')}
            </span>
          ) : (
            <span>{unavailableMsg}</span>
          )}
        </div>
      )}
    </>
  )
}
