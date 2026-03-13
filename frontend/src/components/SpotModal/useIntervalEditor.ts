import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useUpdateBookingTimes } from '@/hooks/useBookings'
import type { Spot } from '@/types'

// — hook —

export function useIntervalEditor(spot: Spot, arrivalTime: string) {
  const [editingInterval, setEditingInterval] = useState(false)
  const [editStart, setEditStart] = useState('09:00')
  const [editEnd, setEditEnd] = useState('17:00')

  const updateBookingTimes = useUpdateBookingTimes()

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

  return {
    editingInterval,
    setEditingInterval,
    editStart,
    setEditStart,
    editEnd,
    setEditEnd,
    updateBookingTimesPending: updateBookingTimes.isPending,
    handleOpenIntervalEdit,
    handleSaveInterval,
  }
}
