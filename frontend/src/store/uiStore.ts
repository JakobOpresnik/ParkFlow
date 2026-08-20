import { create } from 'zustand'

import { invalidateAllSpotQueries } from '@/lib/queryClient'

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

// A bot deep-link (?spot=… with no explicit ?date=) means "today": the link is
// about the spot as it is now, not whatever day this browser last had open. So
// when such a link opens, ignore the persisted date and start on today. An
// explicit ?date= is honoured afterwards by MapPage's deep-link effect, so we
// don't clobber it here.
export function resolveInitialDate(
  search: string,
  stored: string | null,
  today: string,
  weekDays: string[],
): string {
  const params = new URLSearchParams(search)
  const hasSpot = params.get('spot') !== null
  const dateParam = params.get('date')
  const hasValidDate =
    dateParam !== null && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
  if (hasSpot && !hasValidDate) return today
  // A stored day that has already passed is never restored — past days aren't
  // selectable, so a returning/logging-in user always lands on today.
  if (stored && weekDays.includes(stored) && stored >= today) return stored
  return today
}

function loadSelectedDate(): string {
  const today = new Date().toISOString().slice(0, 10)
  try {
    return resolveInitialDate(
      window.location.search,
      localStorage.getItem(SELECTED_DATE_KEY),
      today,
      getCurrentWeekDays(new Date()),
    )
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

  moreDrawerOpen: boolean
  setMoreDrawerOpen: (open: boolean) => void
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
    invalidateAllSpotQueries()
  },

  moreDrawerOpen: false,
  setMoreDrawerOpen: (open) => set({ moreDrawerOpen: open }),
}))
