import { notifications } from '@mantine/notifications'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCancelBooking, useCreateBooking } from '@/hooks/useBookings'
import { useSetSpotDayStatus } from '@/hooks/useOwnerParking'
import type { Spot } from '@/types'

import { fmtTime } from './utils'

// — types —

export interface UseBookingCtaOptions {
  readonly selectedDate: string
  readonly arrivalTime: string
  readonly reservationDuration: number
  readonly myReservedElsewhere: Spot | undefined
  readonly myOwnedSpot?: Spot
}

// — helpers —

function computeExpiresAt(
  arrivalTime: string,
  durationHours: number,
  targetDate: string,
): Date {
  const [hh, mm] = arrivalTime.split(':').map(Number)
  const arrival = new Date(targetDate + 'T12:00:00')
  arrival.setHours(hh ?? 9, mm ?? 0, 0, 0)
  return new Date(arrival.getTime() + durationHours * 3_600_000)
}

// — hook —

export function useBookingCta(spot: Spot, options: UseBookingCtaOptions) {
  const { t } = useTranslation()
  const {
    selectedDate,
    arrivalTime,
    reservationDuration,
    myReservedElsewhere,
    myOwnedSpot,
  } = options

  const [bookingDuration, setBookingDuration] = useState(reservationDuration)
  const [ownerWarningOpen, setOwnerWarningOpen] = useState(false)
  const bookingInFlight = useRef(false)

  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const setSpotDayStatus = useSetSpotDayStatus()

  const today = new Date().toISOString().slice(0, 10)
  const isBookableDate = selectedDate >= today
  const computedExpiry = computeExpiresAt(
    arrivalTime,
    bookingDuration,
    selectedDate,
  )
  const computedExpiryStr = fmtTime(computedExpiry)
  const arrivalWindowPassed =
    selectedDate === today && computedExpiry <= new Date()
  const bookingPending = createBooking.isPending

  const unavailableMsg =
    spot.status === 'occupied'
      ? t('spotModal.spotUnavailableOccupied')
      : t('spotModal.spotUnavailableReserved')

  async function handleBook() {
    if (bookingInFlight.current) return

    if (myOwnedSpot && !ownerWarningOpen) {
      setOwnerWarningOpen(true)
      return
    }

    setOwnerWarningOpen(false)
    bookingInFlight.current = true

    const expiresAt = computeExpiresAt(
      arrivalTime,
      bookingDuration,
      selectedDate,
    )
    const expiryStr = fmtTime(expiresAt)

    try {
      // The backend auto-cancels any same-day booking for this user in the same
      // transaction — no need to cancel explicitly here. Doing so would create
      // failure modes (race conditions, stale data) that block a valid booking.
      const [hh, mm] = arrivalTime.split(':').map(Number)
      const startsAtDate = new Date(selectedDate + 'T12:00:00')
      startsAtDate.setHours(hh ?? 9, mm ?? 0, 0, 0)
      await createBooking.mutateAsync({
        spot_id: spot.id,
        starts_at: startsAtDate.toISOString(),
        expires_at: expiresAt.toISOString(),
      })

      // If the user owns another spot, free it for the day so others can use it.
      if (myOwnedSpot) {
        try {
          await setSpotDayStatus.mutateAsync({
            spotId: myOwnedSpot.id,
            date: selectedDate,
            status: 'free',
          })
        } catch {
          // Non-critical — booking succeeded, day-status is best-effort
        }
      }

      notifications.show({
        message: myReservedElsewhere
          ? t('spotModal.toastMovedToSpot', {
              number: spot.number,
              prevNumber: myReservedElsewhere.number,
            })
          : t('spotModal.toastSpotReservedUntil', {
              number: spot.number,
              time: expiryStr,
            }),
        color: 'green',
      })
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error
            ? err.message
            : t('spotModal.toastBookingFailed'),
        color: 'red',
      })
    } finally {
      bookingInFlight.current = false
    }
  }

  function handleCancelBooking() {
    if (!spot.active_booking_id) return
    cancelBooking.mutate(spot.active_booking_id, {
      onSuccess: () =>
        notifications.show({
          message: t('spotModal.toastReservationCancelled', {
            number: spot.number,
          }),
          color: 'green',
        }),
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error
              ? err.message
              : t('spotModal.toastCancelReservationFailed'),
          color: 'red',
        }),
    })
  }

  return {
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
  }
}
