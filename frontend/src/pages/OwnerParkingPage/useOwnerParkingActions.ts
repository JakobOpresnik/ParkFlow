import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'

import { useCancelBooking, useCreateBooking } from '@/hooks/useBookings'
import { useSetSpotDayStatus } from '@/hooks/useOwnerParking'
import { usePrefsStore } from '@/store/prefsStore'
import type { OwnerSpot } from '@/types'

import { formatDate } from './utils'

// Compute starts_at / expires_at for an owner "Occupy" action on the given
// date, using the user's preferred arrival time and reservation duration.
// Mirrors the map's BookingCta computation so both reservation paths emit
// equivalent booking rows.
function computeOccupyInterval(
  date: string,
  arrivalTime: string,
  durationHours: number,
): { startsAt: Date; expiresAt: Date } {
  const [hh, mm] = arrivalTime.split(':').map(Number)
  const startsAt = new Date(date + 'T12:00:00')
  startsAt.setHours(hh ?? 9, mm ?? 0, 0, 0)
  const expiresAt = new Date(startsAt.getTime() + durationHours * 3_600_000)
  return { startsAt, expiresAt }
}

export function useOwnerParkingActions(selectedDate: string) {
  const { t, i18n } = useTranslation()
  const setDayStatus = useSetSpotDayStatus()
  const cancelBooking = useCancelBooking()
  const createBooking = useCreateBooking()
  const arrivalTime = usePrefsStore((s) => s.arrivalTime)
  const reservationDuration = usePrefsStore((s) => s.reservationDuration)

  function handleSetDayStatus(spot: OwnerSpot, status: 'free' | 'occupied') {
    // "Occupy" creates a real booking under the current user — this is what
    // makes owner attribution show up correctly on the map modal. The
    // backend auto-cancels any same-day booking the user already had, and the
    // ownership gate at POST /api/bookings always allows owners to book their
    // own spot regardless of presence.
    if (status === 'occupied') {
      const { startsAt, expiresAt } = computeOccupyInterval(
        selectedDate,
        arrivalTime,
        reservationDuration,
      )
      createBooking.mutate(
        {
          spot_id: spot.id,
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onSuccess: () =>
            notifications.show({
              message: t('ownerParking.toastSpotOccupied', {
                label: spot.label ?? `#${spot.number}`,
                date: formatDate(selectedDate, i18n.language),
              }),
              color: 'green',
            }),
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error
                  ? err.message
                  : t('ownerParking.toastError'),
              color: 'red',
            }),
        },
      )
      return
    }

    // "Free" remains a spot_day_status override — it expresses the owner's
    // intent ("I won't be coming in") without creating a booking row.
    setDayStatus.mutate(
      { spotId: spot.id, date: selectedDate, status },
      {
        onSuccess: () =>
          notifications.show({
            message: t('ownerParking.toastSpotFreed', {
              label: spot.label ?? `#${spot.number}`,
              date: formatDate(selectedDate, i18n.language),
            }),
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : t('ownerParking.toastError'),
            color: 'red',
          }),
      },
    )
  }

  function handleClearOverride(spot: OwnerSpot) {
    setDayStatus.mutate(
      { spotId: spot.id, date: selectedDate, status: null },
      {
        onSuccess: () =>
          notifications.show({
            message: t('ownerParking.toastSpotReset', {
              label: spot.label ?? `#${spot.number}`,
            }),
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : t('ownerParking.toastError'),
            color: 'red',
          }),
      },
    )
  }

  function handleCancelBooking(spot: OwnerSpot) {
    if (!spot.active_booking_id) return
    cancelBooking.mutate(spot.active_booking_id, {
      onSuccess: (result) => {
        const label = spot.label ?? `#${spot.number}`
        notifications.show({
          message: result.notified
            ? t('ownerParking.toastBookingCancelledNotified', { label })
            : t('ownerParking.toastBookingCancelled', { label }),
          color: 'green',
        })
      },
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error
              ? err.message
              : t('ownerParking.toastCancelError'),
          color: 'red',
        }),
    })
  }

  return {
    handleSetDayStatus,
    handleClearOverride,
    handleCancelBooking,
    isToggling: setDayStatus.isPending || createBooking.isPending,
    isCancelling: cancelBooking.isPending,
  }
}
