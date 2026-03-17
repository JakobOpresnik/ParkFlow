import { useMemo } from 'react'

import { useMyBookings } from '@/hooks/useBookings'
import {
  useOwnerMe,
  useOwnerOverrides,
  useOwnerSpots,
  useOwnerWeek,
} from '@/hooks/useOwnerParking'
import { usePresence } from '@/hooks/usePresence'

import { getNext7Days } from './utils'

export function useOwnerParkingData(selectedDate: string, today: string) {
  const weekEnd = getNext7Days(today)[6] ?? today

  const {
    data: owner,
    isLoading: isOwnerLoading,
    error: ownerError,
  } = useOwnerMe()
  const { data: spots = [], isLoading: isSpotsLoading } = useOwnerSpots()
  const { data: presenceData } = usePresence(selectedDate)
  const { data: weekBookings = [] } = useOwnerWeek(today, weekEnd)
  const { data: overrides = [] } = useOwnerOverrides(today, weekEnd)
  const { data: myBookings = [] } = useMyBookings()

  const ownedSpotIds = useMemo(() => new Set(spots.map((s) => s.id)), [spots])

  const myBookingElsewhere = useMemo(
    () =>
      myBookings.find(
        (b) =>
          b.status === 'active' &&
          !ownedSpotIds.has(b.spot_id) &&
          b.expires_at.slice(0, 10) === selectedDate,
      ),
    [myBookings, ownedSpotIds, selectedDate],
  )

  const workFreeDays = presenceData?.work_free_days ?? []

  const presenceMap = useMemo(() => {
    const map = new Map<string, string>()
    const employees = presenceData?.employees ?? []
    for (const emp of employees) {
      const dayEntry = emp.week.find((d) => d.date === selectedDate)
      if (dayEntry) {
        map.set(emp.name.toLowerCase(), dayEntry.status)
      }
    }
    return map
  }, [presenceData, selectedDate])

  return {
    owner,
    isOwnerLoading,
    ownerError,
    spots,
    isSpotsLoading,
    workFreeDays,
    weekBookings,
    overrides,
    presenceMap,
    myBookingElsewhere,
  }
}
