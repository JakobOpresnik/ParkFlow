import { useState } from 'react'

import { useSpots } from '@/hooks/useSpots'
import { useParkingStore } from '@/store/parkingStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot } from '@/types'

function findSpotByQuery(query: string, spots: Spot[]): Spot | null {
  const trimmed = query.trim()
  if (trimmed === '') return null

  const n = Number.parseInt(trimmed, 10)
  if (Number.isNaN(n)) return null

  return spots.find((s) => s.number === n) ?? null
}

export function useSpotSearch() {
  const [query, setQuery] = useState<string>('')
  const { data: spots } = useSpots()

  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const setSelectedLotId = useParkingStore((s) => s.setSelectedLotId)
  const setHighlightedSpotId = useParkingStore((s) => s.setHighlightedSpotId)
  const setSpotModalOpen = useUIStore((s) => s.setSpotModalOpen)

  const found = findSpotByQuery(query, spots ?? [])

  function handleChange(value: string) {
    setQuery(value)
    const spot: Spot | null = findSpotByQuery(value, spots ?? [])

    if (spot) {
      setHighlightedSpotId(spot.id)
      if (spot.lot_id) setSelectedLotId(spot.lot_id)
    } else {
      setHighlightedSpotId(null)
    }
  }

  function handleResultClick(spot: Spot) {
    setSelectedSpot(spot)
    setSpotModalOpen(true)
  }

  return { query, found, handleChange, handleResultClick }
}
