import { create } from 'zustand'

const STORAGE_KEY = 'pf_user_prefs'

interface UserPrefs {
  notifyOnBooking: boolean
  notifyOnAvailability: boolean
  preferredLotId: string | null
}

interface PrefsStore extends UserPrefs {
  setNotifyOnBooking: (v: boolean) => void
  setNotifyOnAvailability: (v: boolean) => void
  setPreferredLotId: (id: string | null) => void
}

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return {
        notifyOnBooking: true,
        notifyOnAvailability: false,
        preferredLotId: null,
      }
    return JSON.parse(raw) as UserPrefs
  } catch {
    return {
      notifyOnBooking: true,
      notifyOnAvailability: false,
      preferredLotId: null,
    }
  }
}

function savePrefs(prefs: UserPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  ...loadPrefs(),

  setNotifyOnBooking: (v) => {
    set({ notifyOnBooking: v })
    savePrefs({
      notifyOnBooking: v,
      notifyOnAvailability: get().notifyOnAvailability,
      preferredLotId: get().preferredLotId,
    })
  },
  setNotifyOnAvailability: (v) => {
    set({ notifyOnAvailability: v })
    savePrefs({
      notifyOnBooking: get().notifyOnBooking,
      notifyOnAvailability: v,
      preferredLotId: get().preferredLotId,
    })
  },
  setPreferredLotId: (id) => {
    set({ preferredLotId: id })
    savePrefs({
      notifyOnBooking: get().notifyOnBooking,
      notifyOnAvailability: get().notifyOnAvailability,
      preferredLotId: id,
    })
  },
}))
