import { create } from 'zustand'

import { oauthConfig } from '@/lib/oauth'
import type { AppUser } from '@/types'

const ACCESS_TOKEN_KEY = 'pf_access_token'
const ID_TOKEN_KEY = 'pf_id_token'
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export let authInitPromise: Promise<void> = Promise.resolve()

interface AuthStore {
  user: AppUser | null
  accessToken: string | null
  isLoading: boolean
  sessionExpired: boolean
  setAuth: (user: AppUser, accessToken: string, idToken?: string) => void
  setSessionExpired: () => void
  initialize: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  isLoading: true,
  sessionExpired: false,

  setSessionExpired: () => set({ sessionExpired: true }),

  setAuth: (user, accessToken, idToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (idToken) localStorage.setItem(ID_TOKEN_KEY, idToken)
    set({ user, accessToken, isLoading: false })
  },

  initialize: async () => {
    const run = async () => {
      const token = get().accessToken
      if (!token) {
        set({ isLoading: false })
        return
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(ID_TOKEN_KEY)
          set({ user: null, accessToken: null, isLoading: false })
          return
        }

        const user = (await res.json()) as AppUser
        set({ user, isLoading: false })
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(ID_TOKEN_KEY)
        set({ user: null, accessToken: null, isLoading: false })
      }
    }

    authInitPromise = run()
    return authInitPromise
  },

  logout: () => {
    const idToken = localStorage.getItem(ID_TOKEN_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(ID_TOKEN_KEY)
    set({ user: null, accessToken: null })

    // RP-initiated logout via Authentik
    const params = new URLSearchParams({
      post_logout_redirect_uri: `${window.location.origin}/login`,
    })
    if (idToken) params.set('id_token_hint', idToken)

    window.location.href = `${oauthConfig.endSessionUrl}?${params.toString()}`
  },
}))
