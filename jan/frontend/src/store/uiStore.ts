import { create } from 'zustand'

type MapViewMode = 'map' | 'grid'

interface UIStore {
  spotModalOpen: boolean
  setSpotModalOpen: (open: boolean) => void

  mapViewMode: MapViewMode
  setMapViewMode: (mode: MapViewMode) => void
}

export const useUIStore = create<UIStore>((set) => ({
  spotModalOpen: false,
  setSpotModalOpen: (open) => set({ spotModalOpen: open }),

  mapViewMode: 'map',
  setMapViewMode: (mode) => set({ mapViewMode: mode }),
}))
