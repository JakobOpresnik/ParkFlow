import { useMemo } from 'react'

import { useMyBookings } from '@/hooks/useBookings'
import {
  useOwnerMe,
  useOwnerOverrides,
  useOwnerSpots,
  useOwnerWeek,
} from '@/hooks/useOwnerParking'
import { usePresence } from '@/hooks/usePresence'

export function useOwnerParkingData(
  selectedDate: string,
  today: string,
  weekEnd: string,
) {
  const {
    data: owner,
    isLoading: isOwnerLoading,
    isSuccess: isOwnerSuccess,
    error: ownerError,
  } = useOwnerMe()
  const { data: spots = [], isLoading: isSpotsLoading } =
    useOwnerSpots(isOwnerSuccess)
  const { data: presenceData } = usePresence(selectedDate)
  const { data: weekBookings = [] } = useOwnerWeek(
    today,
    weekEnd,
    isOwnerSuccess,
  )
  const { data: overrides = [] } = useOwnerOverrides(
    today,
    weekEnd,
    isOwnerSuccess,
  )
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
    const map = new Map<string, boolean>()
    const employees = presenceData?.employees ?? []
    const isWorkFreeDay = (presenceData?.work_free_days ?? []).includes(
      selectedDate,
    )
    for (const emp of employees) {
      if (isWorkFreeDay) {
        // On holidays everyone's spot is available
        map.set(emp.name.toLowerCase(), true)
      } else {
        const dayEntry = emp.week.find((d) => d.date === selectedDate)
        if (dayEntry) {
          map.set(emp.name.toLowerCase(), dayEntry.parking_available)
        }
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
