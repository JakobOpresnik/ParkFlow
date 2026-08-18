import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'

import { useCancelBooking } from '@/hooks/useBookings'
import { useSetSpotDayStatus } from '@/hooks/useOwnerParking'
import type { DayStatusDuration, OwnerSpot } from '@/types'

import { formatDate } from './utils'

// — constants —

const DURATION_DAYS: Record<
  Exclude<DayStatusDuration, 'indefinite'>,
  number
> = {
  day: 1,
  week: 7,
  month: 30,
}

// Minimal spot shape the actions need — a full map Spot satisfies it too.
type ActionSpot = Pick<
  OwnerSpot,
  'id' | 'number' | 'label' | 'active_booking_id'
>

// — hook —

export function useOwnerParkingActions(selectedDate: string) {
  const { t, i18n } = useTranslation()
  const setDayStatus = useSetSpotDayStatus()
  const cancelBooking = useCancelBooking()

  function handleSetDayStatus(
    spot: ActionSpot,
    status: 'free' | 'occupied',
    duration: DayStatusDuration = 'day',
  ) {
    // Both directions write spot_day_status overrides — they beat presence in
    // every reader and never collide with the user's own bookings elsewhere.
    const label = spot.label ?? `#${spot.number}`
    const indefinite = duration === 'indefinite'
    const days = indefinite ? undefined : DURATION_DAYS[duration]
    const occupied = status === 'occupied'
    let successMessage: string
    if (indefinite) {
      successMessage = t(
        occupied
          ? 'ownerParking.toastSpotOccupiedIndefinite'
          : 'ownerParking.toastSpotFreedIndefinite',
        { label },
      )
    } else if (days === 1) {
      successMessage = t(
        occupied
          ? 'ownerParking.toastSpotOccupied'
          : 'ownerParking.toastSpotFreed',
        { label, date: formatDate(selectedDate, i18n.language) },
      )
    } else {
      successMessage = t(
        occupied
          ? 'ownerParking.toastSpotOccupiedDays'
          : 'ownerParking.toastSpotFreedDays',
        { label, days },
      )
    }

    setDayStatus.mutate(
      {
        spotId: spot.id,
        date: indefinite ? undefined : selectedDate,
        status,
        days,
        indefinite: indefinite || undefined,
      },
      {
        onSuccess: () =>
          notifications.show({ message: successMessage, color: 'green' }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : t('ownerParking.toastError'),
            color: 'red',
          }),
      },
    )
  }

  function handleClearOverride(spot: ActionSpot, indefinite = false) {
    setDayStatus.mutate(
      {
        spotId: spot.id,
        date: indefinite ? undefined : selectedDate,
        status: null,
        indefinite: indefinite || undefined,
      },
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

  function handleCancelBooking(spot: ActionSpot) {
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
    isToggling: setDayStatus.isPending,
    isCancelling: cancelBooking.isPending,
  }
}
