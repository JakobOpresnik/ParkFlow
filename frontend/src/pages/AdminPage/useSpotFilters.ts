import { useMemo, useState } from 'react'

import { isDisplayedUnavailable } from '@/lib/spots'
import type { ParkingLot, Spot, SpotStatus, SpotType } from '@/types'

// 'unavailable' is a display-only status (reserved with no reserver name),
// not a backend SpotStatus — see isDisplayedUnavailable.
export type SpotStatusFilter = SpotStatus | 'unavailable' | 'all'

// — hook —

export function useSpotFilters(allSpots: Spot[], lots: ParkingLot[]) {
  const [lotFilter, setLotFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<SpotStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<SpotType | 'all'>('all')
  const [spotSearch, setSpotSearch] = useState('')

  const displayedSpots = useMemo(() => {
    let filtered =
      lotFilter === 'all'
        ? allSpots
        : allSpots.filter((s) => s.lot_id === lotFilter)

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) =>
        statusFilter === 'unavailable'
          ? isDisplayedUnavailable(s)
          : s.status === statusFilter && !isDisplayedUnavailable(s),
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((s) => (s.type ?? 'standard') === typeFilter)
    }

    if (spotSearch.trim()) {
      const q = spotSearch.toLowerCase()
      const lotNameMap = new Map(lots.map((l) => [l.id, l.name.toLowerCase()]))
      filtered = filtered.filter(
        (s) =>
          (s.label?.toLowerCase().includes(q) ?? false) ||
          (s.owner_name?.toLowerCase().includes(q) ?? false) ||
          String(s.number).includes(q) ||
          (lotNameMap.get(s.lot_id ?? '')?.includes(q) ?? false),
      )
    }

    return filtered
  }, [allSpots, lotFilter, statusFilter, typeFilter, spotSearch, lots])

  function getLotName(lotId: string | null) {
    return lots.find((l) => l.id === lotId)?.name ?? '—'
  }

  return {
    lotFilter,
    setLotFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    spotSearch,
    setSpotSearch,
    displayedSpots,
    getLotName,
  }
}
