import { create } from 'zustand'

const SELECTED_DATE_KEY = 'pf_selected_date'

function loadSelectedDate(): string {
  try {
    return (
      localStorage.getItem(SELECTED_DATE_KEY) ??
      new Date().toISOString().slice(0, 10)
    )
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

type MapViewMode = 'map' | 'grid'

interface UIStore {
  spotModalOpen: boolean
  setSpotModalOpen: (open: boolean) => void

  mapViewMode: MapViewMode
  setMapViewMode: (mode: MapViewMode) => void

  selectedDate: string
  setSelectedDate: (date: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  spotModalOpen: false,
  setSpotModalOpen: (open) => set({ spotModalOpen: open }),

  mapViewMode: 'map',
  setMapViewMode: (mode) => set({ mapViewMode: mode }),

  selectedDate: loadSelectedDate(),
  setSelectedDate: (date) => {
    localStorage.setItem(SELECTED_DATE_KEY, date)
    set({ selectedDate: date })
  },
}))
