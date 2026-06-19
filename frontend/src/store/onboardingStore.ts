import { create } from 'zustand'

const STORAGE_KEY = 'pf_onboarding_seen'

/**
 * One-time announcement keys. Add a new entry (or bump the version suffix) to
 * surface a fresh onboarding modal — past acknowledgements stay recorded so
 * older announcements never re-appear.
 */
export type OnboardingKey = 'reminders_v1'

/**
 * userId → { announcement key → acknowledged }. Scoping by user (rather than a
 * single browser-wide flag) means a shared browser shows each announcement once
 * per distinct user, while a given user still sees it again on another device
 * (localStorage is inherently per-browser).
 */
type SeenMap = Record<string, Record<string, boolean>>

interface OnboardingStore {
  seen: SeenMap
  markSeen: (userId: string, key: OnboardingKey) => void
}

function loadSeen(): SeenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SeenMap
  } catch {
    return {}
  }
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  seen: loadSeen(),
  markSeen: (userId, key) => {
    const prev = get().seen
    const seen: SeenMap = {
      ...prev,
      [userId]: { ...prev[userId], [key]: true },
    }
    set({ seen })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
    } catch {
      // Ignore write failures (private mode, storage disabled) — worst case the
      // announcement shows again next session.
    }
  },
}))
