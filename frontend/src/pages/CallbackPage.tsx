import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { notifications } from '@mantine/notifications'
import { oauthConfig } from '@/lib/oauth'
import { useAuthStore } from '@/store/authStore'
import type { AppUser } from '@/types'

export function CallbackPage() {
  const navigate = useNavigate()
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

        // Exchange code for tokens — proxied through Vite dev server (no CORS)
        const tokenRes = await fetch(oauthConfig.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: oauthConfig.redirectUri,
            client_id: oauthConfig.clientId,
            code_verifier: verifier,
          }),
        })

        if (!tokenRes.ok) {
          const err = await tokenRes.text()
          throw new Error(`Token exchange failed: ${err}`)
        }

        const tokens = (await tokenRes.json()) as {
          access_token: string
          id_token?: string
        }

        // Fetch userinfo
        const userinfoRes = await fetch(oauthConfig.userinfoUrl, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })

        if (!userinfoRes.ok) {
          throw new Error('Failed to fetch user info')
        }

        const userinfo = (await userinfoRes.json()) as {
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

        useAuthStore
          .getState()
          .setAuth(user, tokens.access_token, tokens.id_token)

        // Clean up session storage
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_code_verifier')

        void navigate({ to: '/' })
      } catch (err) {
        notifications.show({
          message: err instanceof Error ? err.message : 'Authentication failed',
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
        <p className="text-muted-foreground text-sm">Completing sign-in…</p>
      </div>
    </div>
  )
}
