import { create } from 'zustand'

const STORAGE_KEY = 'pf_user_prefs'

interface UserPrefs {
  notifyOnBooking: boolean
  notifyOnAvailability: boolean
  preferredLotId: string | null
  /** HH:MM, e.g. "08:00" — used as the default reservation start time */
  arrivalTime: string
  /** Default reservation duration in hours, e.g. 8 */
  reservationDuration: number
}

interface PrefsStore extends UserPrefs {
  setNotifyOnBooking: (v: boolean) => void
  setNotifyOnAvailability: (v: boolean) => void
  setPreferredLotId: (id: string | null) => void
  setArrivalTime: (t: string) => void
  setReservationDuration: (h: number) => void
}

const DEFAULTS: UserPrefs = {
  notifyOnBooking: true,
  notifyOnAvailability: false,
  preferredLotId: null,
  arrivalTime: '09:00',
  reservationDuration: 8,
}

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const stored = JSON.parse(raw) as Partial<UserPrefs>
    return {
      notifyOnBooking: stored.notifyOnBooking ?? DEFAULTS.notifyOnBooking,
      notifyOnAvailability:
        stored.notifyOnAvailability ?? DEFAULTS.notifyOnAvailability,
      preferredLotId: stored.preferredLotId ?? DEFAULTS.preferredLotId,
      arrivalTime: stored.arrivalTime ?? DEFAULTS.arrivalTime,
      reservationDuration:
        stored.reservationDuration ?? DEFAULTS.reservationDuration,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function savePrefs(prefs: UserPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  ...loadPrefs(),

  setNotifyOnBooking: (v) => {
    set({ notifyOnBooking: v })
    savePrefs({ ...get(), notifyOnBooking: v })
  },
  setNotifyOnAvailability: (v) => {
    set({ notifyOnAvailability: v })
    savePrefs({ ...get(), notifyOnAvailability: v })
  },
  setPreferredLotId: (id) => {
    set({ preferredLotId: id })
    savePrefs({ ...get(), preferredLotId: id })
  },
  setArrivalTime: (t) => {
    set({ arrivalTime: t })
    savePrefs({ ...get(), arrivalTime: t })
  },
  setReservationDuration: (h) => {
    set({ reservationDuration: h })
    savePrefs({ ...get(), reservationDuration: h })
  },
}))
