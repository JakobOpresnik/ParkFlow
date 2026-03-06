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

  const data = useMemo<Spot[]>(() => {
    const spots = spotsQuery.data ?? []
    const presence = presenceQuery.data ?? []
    const today = new Date().toISOString().slice(0, 10)
    const isToday = date === today

    // Map lowercase name → 'in_office' | 'absent' for the selected date
    const presenceByName = new Map<string, 'in_office' | 'absent'>()
    for (const p of presence) {
      const dayEntry = p.week.find((d) => d.date === date)
      if (dayEntry) {
        presenceByName.set(
          p.name.toLowerCase(),
          dayEntry.status === 'in_office' ? 'in_office' : 'absent',
        )
      }
    }

    return spots.map((spot) => {
      // Active bookings only apply to today's view — other dates use presence-based status.
      if (spot.status === 'reserved' && isToday) return spot

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
        status: presenceStatus === 'in_office' ? 'occupied' : ('free' as const),
      }
    })
  }, [spotsQuery.data, presenceQuery.data, date])

  return { ...spotsQuery, data }
}
