import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'

import { useCancelBooking } from '@/hooks/useBookings'
import { useSetSpotDayStatus } from '@/hooks/useOwnerParking'
import type { Booking, OwnerSpot } from '@/types'

import { formatDate } from './utils'

export function useOwnerParkingActions(
  selectedDate: string,
  myBookingElsewhere: Booking | undefined,
) {
  const { t, i18n } = useTranslation()
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
                  message: t('ownerParking.toastSpotOccupied', {
                    number: spot.number,
                    date: formatDate(selectedDate, i18n.language),
                  }),
                  color: 'green',
                }),
              onError: (err) =>
                notifications.show({
                  message:
                    err instanceof Error
                      ? err.message
                      : t('ownerParking.toastCancelError'),
                  color: 'red',
                }),
            })
          } else {
            notifications.show({
              message:
                status === 'free'
                  ? t('ownerParking.toastSpotFreed', {
                      number: spot.number,
                      date: formatDate(selectedDate, i18n.language),
                    })
                  : t('ownerParking.toastSpotOccupied', {
                      number: spot.number,
                      date: formatDate(selectedDate, i18n.language),
                    }),
              color: 'green',
            })
          }
        },
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
            message: t('ownerParking.toastSpotReset', { number: spot.number }),
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
      onSuccess: () =>
        notifications.show({
          message: t('ownerParking.toastBookingCancelled', {
            number: spot.number,
          }),
          color: 'green',
        }),
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
    isToggling: setDayStatus.isPending,
    isCancelling: cancelBooking.isPending,
  }
}
