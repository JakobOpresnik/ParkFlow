import { useMemo } from 'react'

import { usePresence } from '@/hooks/usePresence'
import { useSpots } from '@/hooks/useSpots'
import type { PresenceStatus, Spot } from '@/types'
import { PRESENCE_STATUSES } from '@/types'

const ABSENT_STATUSES = new Set<PresenceStatus>(
  PRESENCE_STATUSES.filter((s) => s !== 'in_office'),
)

/**
 * Returns all spots with presence-aware status overrides applied:
 * if a spot's owner is marked absent in the timesheet today
 * (remote / sick / care / vacation), the spot is shown as free.
 */
export function useEffectiveSpots() {
  const spotsQuery = useSpots()
  const today = new Date().toISOString().slice(0, 10)
  const presenceQuery = usePresence(today)

  const data = useMemo<Spot[]>(() => {
    const spots = spotsQuery.data ?? []
    const presence = presenceQuery.data ?? []

    if (presence.length === 0) return spots

    const absentNames = new Set(
      presence
        .filter((p) => ABSENT_STATUSES.has(p.status))
        .map((p) => p.name.toLowerCase()),
    )

    return spots.map((spot) => {
      if (
        spot.status === 'occupied' &&
        spot.owner_name !== null &&
        absentNames.has(spot.owner_name.toLowerCase())
      ) {
        return { ...spot, status: 'free' as const }
      }
      return spot
    })
  }, [spotsQuery.data, presenceQuery.data])

  return { ...spotsQuery, data }
}
