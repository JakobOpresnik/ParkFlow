import { create } from 'zustand'

import { oauthConfig } from '@/lib/oauth'
import type { AppUser } from '@/types'

const ACCESS_TOKEN_KEY = 'pf_access_token'
const ID_TOKEN_KEY = 'pf_id_token'

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
        const res = await fetch(oauthConfig.userinfoUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(ID_TOKEN_KEY)
          set({ user: null, accessToken: null, isLoading: false })
          return
        }

        const userinfo = (await res.json()) as {
          sub: string
          preferred_username?: string
          name?: string
          groups?: string[]
        }

        const user: AppUser = {
          id: userinfo.sub,
          username: userinfo.preferred_username ?? userinfo.sub,
          displayName:
            userinfo.name ?? userinfo.preferred_username ?? userinfo.sub,
          role: userinfo.groups?.includes(oauthConfig.adminGroup)
            ? 'admin'
            : 'user',
        }

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
