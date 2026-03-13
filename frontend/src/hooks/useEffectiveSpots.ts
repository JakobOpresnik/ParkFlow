import { useMemo } from 'react'

import { usePresence } from '@/hooks/usePresence'
import { useSpotDayOverrides, useSpots } from '@/hooks/useSpots'
import type { Spot } from '@/types'

/**
 * Returns all spots with effective status for a given date.
 * Priority (matches backend booking logic):
 *   1. Active booking on this date → reserved
 *   2. Manual override (spot_day_status) → free / occupied
 *   3. Presence/timesheet → in_office = occupied, away = free
 *   4. Fallback → spots.status
 */
export function useEffectiveSpots(date: string) {
  const spotsQuery = useSpots()
  const presenceQuery = usePresence(date)
  const overridesQuery = useSpotDayOverrides(date)

  const isWorkFreeDay = useMemo(() => {
    return presenceQuery.data?.work_free_days.includes(date) ?? false
  }, [presenceQuery.data, date])

  const data = useMemo<Spot[]>(() => {
    const spots = spotsQuery.data ?? []
    const employees = presenceQuery.data?.employees ?? []
    const workFreeDays = presenceQuery.data?.work_free_days ?? []
    const today = new Date().toISOString().slice(0, 10)
    const isToday = date === today

    // Override lookup: spot_id → 'free' | 'occupied'
    const overrides = overridesQuery.data ?? []
    const overrideBySpot = new Map<string, 'free' | 'occupied'>()
    for (const o of overrides) {
      overrideBySpot.set(o.spot_id, o.status)
    }

    // Presence lookup: lowercase name → 'in_office' | 'absent'
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

      // 2. Manual override → authoritative
      const override = overrideBySpot.get(spot.id)
      if (override) {
        return { ...spot, status: override }
      }

      // Support shared spots: owner_name may be "Name1 / Name2"
      const ownerNames = (spot.owner_name ?? '')
        .split('/')
        .map((n) => n.trim())
        .filter(Boolean)

      const inOfficeOwner = ownerNames.find(
        (n) => presenceByName.get(n.toLowerCase()) === 'in_office',
      )
      const anyPresenceData = ownerNames.some(
        (n) => presenceByName.get(n.toLowerCase()) !== undefined,
      )

      // No presence data for any owner → reset non-today reservations to free.
      if (!anyPresenceData) {
        return spot.status === 'reserved'
          ? { ...spot, status: 'free' as const }
          : spot
      }

      return {
        ...spot,
        status: inOfficeOwner ? ('occupied' as const) : ('free' as const),
        in_office_owner: inOfficeOwner ?? null,
      }
    })

    // Deduplicate: a spot with bookings on multiple days produces multiple rows.
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
  }, [spotsQuery.data, presenceQuery.data, overridesQuery.data, date])

  return {
    ...spotsQuery,
    data,
    isWorkFreeDay,
    isLoadingPresence: presenceQuery.isLoading,
  }
}
