import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'

import { useCancelBooking } from '@/hooks/useBookings'
import { useSetSpotDayStatus } from '@/hooks/useOwnerParking'
import type { OwnerSpot } from '@/types'

import { formatDate } from './utils'

export function useOwnerParkingActions(selectedDate: string) {
  const { t, i18n } = useTranslation()
  const setDayStatus = useSetSpotDayStatus()
  const cancelBooking = useCancelBooking()

  async function handleSetDayStatus(
    spot: OwnerSpot,
    status: 'free' | 'occupied',
  ) {
    if (status === 'occupied') {
      // "Occupy" goes through the day-status endpoint so the backend can
      // auto-cancel any conflicting non-owner reservation and return a
      // `released` list that we surface in the toast.
      try {
        const result = await setDayStatus.mutateAsync({
          spotId: spot.id,
          date: selectedDate,
          status: 'occupied',
        })
        const released = result.released ?? []
        notifications.show({
          message:
            released.length > 0
              ? `Reclaimed ${spot.label ?? `#${spot.number}`} — released ${
                  released[0]?.reserved_by ?? 'a user'
                }'s reservation${released.length > 1 ? ` (+${released.length - 1} more)` : ''}.`
              : t('ownerParking.toastSpotOccupied', {
                  label: spot.label ?? `#${spot.number}`,
                  date: formatDate(selectedDate, i18n.language),
                }),
          color: released.length > 0 ? 'orange' : 'green',
        })
      } catch (err) {
        notifications.show({
          message:
            err instanceof Error ? err.message : t('ownerParking.toastError'),
          color: 'red',
        })
      }
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
      onSuccess: () =>
        notifications.show({
          message: t('ownerParking.toastBookingCancelled', {
            label: spot.label ?? `#${spot.number}`,
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
