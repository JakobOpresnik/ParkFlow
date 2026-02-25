import { create } from 'zustand'
import type { AppUser } from '@/types'

const TOKEN_KEY = 'pf_token'

interface AuthStore {
  user: AppUser | null
  token: string | null
  setAuth: (user: AppUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null })
  },
}))
