import { create } from 'zustand'

const SELECTED_DATE_KEY = 'pf_selected_date'

/** Mon–Fri ISO dates for the week containing `ref`. */
function getCurrentWeekDays(ref: Date): string[] {
  const dow = ref.getDay() // 0=Sun … 6=Sat
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function loadSelectedDate(): string {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const stored = localStorage.getItem(SELECTED_DATE_KEY)
    if (stored && getCurrentWeekDays(new Date()).includes(stored)) return stored
    return today
  } catch {
    return today
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
