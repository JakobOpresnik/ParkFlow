import { notifications } from '@mantine/notifications'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { oauthConfig } from '@/lib/oauth'
import { useAuthStore } from '@/store/authStore'
import type { AppUser } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export function CallbackPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    void handleCallback()

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')

        if (!code || !state) {
          throw new Error('Missing code or state parameter')
        }

        const savedState = sessionStorage.getItem('oauth_state')
        if (state !== savedState) {
          throw new Error('State mismatch — possible CSRF attack')
        }

        const verifier = sessionStorage.getItem('oauth_code_verifier')
        if (!verifier) {
          throw new Error('Missing PKCE code verifier')
        }

        // Exchange code via backend — backend holds the client secret
        const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: verifier,
            redirect_uri: oauthConfig.redirectUri,
          }),
        })

        if (!exchangeRes.ok) {
          const err = (await exchangeRes.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(err.error ?? 'Token exchange failed')
        }

        const { token, id_token } = (await exchangeRes.json()) as {
          token: string
          id_token: string | null
        }

        // Fetch user info from backend using the issued JWT
        const meRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!meRes.ok) {
          throw new Error('Failed to fetch user info')
        }

        const user = (await meRes.json()) as AppUser

        useAuthStore.getState().setAuth(user, token, id_token ?? undefined)

        // Clean up session storage
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_code_verifier')

        void navigate({ to: '/' })
      } catch (err) {
        notifications.show({
          message:
            err instanceof Error
              ? err.message
              : t('callback.authenticationFailed'),
          color: 'red',
        })
        void navigate({ to: '/login' })
      }
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">
          {t('callback.completingSignIn')}
        </p>
      </div>
    </div>
  )
}
