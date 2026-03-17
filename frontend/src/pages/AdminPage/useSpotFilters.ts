import { useMemo, useState } from 'react'

import type { ParkingLot, Spot, SpotStatus, SpotType } from '@/types'

// — hook —

export function useSpotFilters(allSpots: Spot[], lots: ParkingLot[]) {
  const [lotFilter, setLotFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<SpotStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<SpotType | 'all'>('all')
  const [spotSearch, setSpotSearch] = useState('')

  const displayedSpots = useMemo(() => {
    let filtered =
      lotFilter === 'all'
        ? allSpots
        : allSpots.filter((s) => s.lot_id === lotFilter)

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter)
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
