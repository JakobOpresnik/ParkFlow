import { notifications } from '@mantine/notifications'

import { useCancelBooking } from '@/hooks/useBookings'
import { useSetSpotDayStatus } from '@/hooks/useOwnerParking'
import type { Booking, OwnerSpot } from '@/types'

import { formatDate } from './utils'

export function useOwnerParkingActions(
  selectedDate: string,
  myBookingElsewhere: Booking | undefined,
) {
  const setDayStatus = useSetSpotDayStatus()
  const cancelBooking = useCancelBooking()

  function handleSetDayStatus(spot: OwnerSpot, status: 'free' | 'occupied') {
    // Capture at call time so the closure stays consistent even if selectedDate changes
    const bookingToCancel =
      status === 'occupied' ? myBookingElsewhere : undefined

    setDayStatus.mutate(
      { spotId: spot.id, date: selectedDate, status },
      {
        onSuccess: () => {
          if (bookingToCancel) {
            // Re-occupying own spot — also cancel the switched-to booking so
            // the other spot is freed on the map immediately.
            cancelBooking.mutate(bookingToCancel.id, {
              onSuccess: () =>
                notifications.show({
                  message: `Mesto #${spot.number} zasedeno za ${formatDate(selectedDate)}`,
                  color: 'green',
                }),
              onError: (err) =>
                notifications.show({
                  message:
                    err instanceof Error ? err.message : 'Napaka pri preklicu',
                  color: 'red',
                }),
            })
          } else {
            notifications.show({
              message:
                status === 'free'
                  ? `Mesto #${spot.number} sproščeno za ${formatDate(selectedDate)}`
                  : `Mesto #${spot.number} zasedeno za ${formatDate(selectedDate)}`,
              color: 'green',
            })
          }
        },
        onError: (err) =>
          notifications.show({
            message: err instanceof Error ? err.message : 'Napaka',
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
            message: `Mesto #${spot.number} ponastavljeno na timesheet`,
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message: err instanceof Error ? err.message : 'Napaka',
            color: 'red',
          }),
      },
    )
  }

  function handleCancelBooking(spot: OwnerSpot) {
    if (!spot.active_booking_id) return
    cancelBooking.mutate(spot.active_booking_id, {
      onSuccess: () =>
        notifications.show({
          message: `Rezervacija na mestu #${spot.number} preklicana`,
          color: 'green',
        }),
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Preklic ni uspel',
          color: 'red',
        }),
    })
  }

  return {
    handleSetDayStatus,
    handleClearOverride,
    handleCancelBooking,
    isToggling: setDayStatus.isPending,
    isCancelling: cancelBooking.isPending,
  }
}
