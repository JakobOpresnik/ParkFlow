import { useMemo } from 'react'

import { usePresence } from '@/hooks/usePresence'
import { useSpots } from '@/hooks/useSpots'
import type { Spot } from '@/types'

/**
 * Returns all spots with presence-aware status overrides applied.
 * For spots whose owner appears in the timesheet for the given date:
 *   - in_office  → occupied
 *   - anything else (remote / sick / care / vacation / no_entry) → free
 * Spots with no owner, or whose owner is not in the timesheet, keep their DB status.
 */
export function useEffectiveSpots(date: string) {
  const spotsQuery = useSpots()
  const presenceQuery = usePresence(date)

  const isWorkFreeDay = useMemo(() => {
    return presenceQuery.data?.work_free_days.includes(date) ?? false
  }, [presenceQuery.data, date])

  const data = useMemo<Spot[]>(() => {
    const spots = spotsQuery.data ?? []
    const employees = presenceQuery.data?.employees ?? []
    const workFreeDays = presenceQuery.data?.work_free_days ?? []
    const today = new Date().toISOString().slice(0, 10)
    const isToday = date === today

    // Map lowercase name → 'in_office' | 'absent' for the selected date
    const presenceByName = new Map<string, 'in_office' | 'absent'>()

    // If it's a work-free day (holiday), everyone is absent
    if (workFreeDays.includes(date)) {
      for (const p of employees) {
        presenceByName.set(p.name.toLowerCase(), 'absent')
      }
    } else {
      for (const p of employees) {
        const dayEntry = p.week.find((d) => d.date === date)
        if (dayEntry) {
          presenceByName.set(
            p.name.toLowerCase(),
            dayEntry.status === 'in_office' ? 'in_office' : 'absent',
          )
        }
      }
    }

    const processed = spots.map((spot) => {
      // Preserve reserved status when there's an active booking for the selected date.
      // For today with no booking (manually reserved): always keep reserved.
      // For booking-backed reservations: keep only if the booking's date matches.
      const bookingIsForDate =
        spot.active_booking_expires_at?.slice(0, 10) === date
      const hasNoBooking = spot.active_booking_expires_at == null
      if (
        spot.status === 'reserved' &&
        (bookingIsForDate || (isToday && hasNoBooking))
      )
        return spot

      // No owner → presence has no effect; reset any non-today reservation to free.
      if (spot.owner_name === null) {
        return spot.status === 'reserved'
          ? { ...spot, status: 'free' as const }
          : spot
      }

      const presenceStatus = presenceByName.get(spot.owner_name.toLowerCase())
      // No presence data for this owner → reset non-today reservations to free, leave others.
      if (presenceStatus === undefined) {
        return spot.status === 'reserved'
          ? { ...spot, status: 'free' as const }
          : spot
      }

      return {
        ...spot,
        status:
          presenceStatus === 'in_office'
            ? ('occupied' as const)
            : ('free' as const),
      }
    })

    // Deduplicate: a spot with bookings on multiple days produces multiple rows.
    // Keep the entry whose booking matches the selected date; fall back to reserved > other.
    const byId = new Map<string, Spot>()
    for (const spot of processed) {
      const existing = byId.get(spot.id)
      if (!existing) {
        byId.set(spot.id, spot)
        continue
      }
      const existingForDate =
        existing.active_booking_expires_at?.slice(0, 10) === date
      const newForDate = spot.active_booking_expires_at?.slice(0, 10) === date
      if (newForDate && !existingForDate) {
        byId.set(spot.id, spot)
      } else if (
        !newForDate &&
        !existingForDate &&
        spot.status === 'reserved' &&
        existing.status !== 'reserved'
      ) {
        byId.set(spot.id, spot)
      }
    }
    return Array.from(byId.values())
  }, [spotsQuery.data, presenceQuery.data, date])

  return { ...spotsQuery, data, isWorkFreeDay }
}
