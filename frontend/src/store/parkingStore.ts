import { create } from 'zustand'

import type { Spot } from '@/types'

interface ParkingStore {
  selectedSpot: Spot | null
  selectedLotId: string | null
  highlightedSpotId: string | null
  setSelectedSpot: (spot: Spot | null) => void
  setSelectedLotId: (lotId: string | null) => void
  setHighlightedSpotId: (id: string | null) => void
}

export const useParkingStore = create<ParkingStore>((set) => ({
  selectedSpot: null,
  selectedLotId: null,
  highlightedSpotId: null,
  setSelectedSpot: (spot) => set({ selectedSpot: spot }),
  setSelectedLotId: (lotId) =>
    set({ selectedLotId: lotId, selectedSpot: null }),
  setHighlightedSpotId: (id) => set({ highlightedSpotId: id }),
}))
