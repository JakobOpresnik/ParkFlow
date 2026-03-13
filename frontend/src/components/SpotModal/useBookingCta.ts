import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import {
  useCancelBooking,
  useCreateBooking,
  useUpdateBookingTimes,
} from '@/hooks/useBookings'
import type { Spot } from '@/types'

export interface UseBookingCtaOptions {
  readonly selectedDate: string
  readonly arrivalTime: string
  readonly reservationDuration: number
  readonly myReservedElsewhere: Spot | undefined
}

export function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

export function useBookingCta(spot: Spot, options: UseBookingCtaOptions) {
  const {
    selectedDate,
    arrivalTime,
    reservationDuration,
    myReservedElsewhere,
  } = options

  const [bookingDuration, setBookingDuration] = useState(reservationDuration)
  const [editingInterval, setEditingInterval] = useState(false)
  const [editStart, setEditStart] = useState('09:00')
  const [editEnd, setEditEnd] = useState('17:00')

  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const updateBookingTimes = useUpdateBookingTimes()

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
  const bookingPending = createBooking.isPending || cancelBooking.isPending
  const updateBookingTimesPending = updateBookingTimes.isPending

  const unavailableMsg =
    spot.status === 'occupied'
      ? 'Spot unavailable — currently occupied'
      : 'Spot unavailable — already reserved'

  async function handleBook() {
    const expiresAt = computeExpiresAt(
      arrivalTime,
      bookingDuration,
      selectedDate,
    )
    const expiryStr = fmtTime(expiresAt)

    if (myReservedElsewhere?.active_booking_id) {
      try {
        await cancelBooking.mutateAsync(myReservedElsewhere.active_booking_id)
      } catch (err) {
        notifications.show({
          message:
            err instanceof Error
              ? err.message
              : 'Could not cancel existing reservation',
          color: 'red',
        })
        return
      }
    }

    try {
      const [hh, mm] = arrivalTime.split(':').map(Number)
      const startsAtDate = new Date(selectedDate + 'T12:00:00')
      startsAtDate.setHours(hh ?? 9, mm ?? 0, 0, 0)
      await createBooking.mutateAsync({
        spot_id: spot.id,
        starts_at: startsAtDate.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      notifications.show({
        message: myReservedElsewhere
          ? `Moved to spot #${spot.number} — spot #${myReservedElsewhere.number} reservation cancelled.`
          : `Spot #${spot.number} reserved until ${expiryStr}!`,
        color: 'green',
      })
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Booking failed',
        color: 'red',
      })
    }
  }

  function handleOpenIntervalEdit() {
    if (!spot.active_booking_expires_at) return
    const expiry = new Date(spot.active_booking_expires_at)
    const start = spot.active_booking_starts_at
      ? new Date(spot.active_booking_starts_at)
      : null
    const startHH = start
      ? String(start.getHours()).padStart(2, '0')
      : arrivalTime.split(':')[0]
    const startMM = start
      ? String(start.getMinutes()).padStart(2, '0')
      : arrivalTime.split(':')[1]
    setEditStart(`${startHH}:${startMM}`)
    setEditEnd(
      `${String(expiry.getHours()).padStart(2, '0')}:${String(expiry.getMinutes()).padStart(2, '0')}`,
    )
    setEditingInterval(true)
  }

  function handleSaveInterval() {
    if (!spot.active_booking_id || !spot.active_booking_expires_at) return
    const bookingDate = spot.active_booking_expires_at.slice(0, 10)
    const [sh, sm] = editStart.split(':').map(Number)
    const [eh, em] = editEnd.split(':').map(Number)
    const newStart = new Date(bookingDate + 'T12:00:00')
    newStart.setHours(sh ?? 9, sm ?? 0, 0, 0)
    const newEnd = new Date(bookingDate + 'T12:00:00')
    newEnd.setHours(eh ?? 17, em ?? 0, 0, 0)

    if (newEnd <= newStart) {
      notifications.show({ message: 'End must be after start', color: 'red' })
      return
    }

    updateBookingTimes.mutate(
      {
        id: spot.active_booking_id,
        starts_at: newStart.toISOString(),
        expires_at: newEnd.toISOString(),
      },
      {
        onSuccess: () => {
          setEditingInterval(false)
          notifications.show({
            message: `Reservation updated: ${editStart} – ${editEnd}`,
            color: 'green',
          })
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to update times',
            color: 'red',
          }),
      },
    )
  }

  function handleCancelBooking() {
    if (!spot.active_booking_id) return
    cancelBooking.mutate(spot.active_booking_id, {
      onSuccess: () =>
        notifications.show({
          message: `Reservation for spot #${spot.number} cancelled.`,
          color: 'green',
        }),
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : 'Failed to cancel reservation',
          color: 'red',
        }),
    })
  }

  return {
    bookingDuration,
    setBookingDuration,
    editingInterval,
    setEditingInterval,
    editStart,
    setEditStart,
    editEnd,
    setEditEnd,
    isBookableDate,
    computedExpiryStr,
    arrivalWindowPassed,
    bookingPending,
    updateBookingTimesPending,
    unavailableMsg,
    handleBook,
    handleOpenIntervalEdit,
    handleSaveInterval,
    handleCancelBooking,
  }
}
