import {
  ArrowRightLeft,
  CalendarCheck,
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

  const canReserveNow =
    spot.status === 'free' && !!user && isBookableDate && !arrivalWindowPassed
  const freeWindowExpired =
    spot.status === 'free' && !!user && isBookableDate && arrivalWindowPassed
  const freeButUnavailable =
    spot.status === 'free' && (!user || !isBookableDate)
  const isUnavailableSpot =
    spot.status === 'occupied' ||
    (spot.status === 'reserved' && !canCancelThisBooking)

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
          {ownerWarningOpen ? (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {t('spotModal.ownerWarningTitle', {
                  number: myOwnedSpot?.number,
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('spotModal.ownerWarningDesc', {
                  number: myOwnedSpot?.number,
                  spotNumber: spot.number,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  className="h-9 flex-1 gap-2 text-sm font-semibold"
                  disabled={bookingPending}
                  onClick={handleBook}
                >
                  <CalendarCheck className="size-4" />
                  {t('spotModal.reserveSpotNumber', { number: spot.number })}
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
          {!ownerWarningOpen && myReservedElsewhere && (
            <p className="text-muted-foreground text-center text-xs">
              {t('spotModal.spotReservationWillBeCancelled', {
                number: myReservedElsewhere.number,
              })}
            </p>
          )}
        </div>
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
          {spot.status === 'reserved' && spot.active_booking_expires_at ? (
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
          ) : (
            <span>{unavailableMsg}</span>
          )}
        </div>
      )}
    </>
  )
}
