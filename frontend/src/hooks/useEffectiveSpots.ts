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

    if (presence.length === 0) return spots

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
      // Reserved = live booking. Always preserve it regardless of viewed date.
      if (spot.status === 'reserved') return spot
      // Spots with no owner are unaffected by presence.
      if (spot.owner_name === null) return spot
      const presenceStatus = presenceByName.get(spot.owner_name.toLowerCase())
      if (presenceStatus === undefined) return spot
      return {
        ...spot,
        status: presenceStatus === 'in_office' ? 'occupied' : ('free' as const),
      }
    })
  }, [spotsQuery.data, presenceQuery.data, date])

  return { ...spotsQuery, data }
}
