import { notifications } from '@mantine/notifications'
import { useNavigate } from '@tanstack/react-router'
import {
  BarChart2,
  Calendar,
  LogIn,
  Map,
  ParkingCircle,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { oauthConfig } from '@/lib/oauth'
import { generateCodeChallenge, generateCodeVerifier } from '@/lib/pkce'
import { useAuthStore } from '@/store/authStore'

// — constants —

const FEATURE_CONFIG = [
  {
    Icon: Map,
    labelKey: 'login.featureLiveMap',
    descKey: 'login.featureLiveMapDesc',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    Icon: Calendar,
    labelKey: 'login.featureReservations',
    descKey: 'login.featureReservationsDesc',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    Icon: BarChart2,
    labelKey: 'login.featureAnalytics',
    descKey: 'login.featureAnalyticsDesc',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
] as const

// — main component —

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  async function handleGuest() {
    setGuestLoading(true)
    try {
      await loginAsGuest()
      await navigate({ to: '/' })
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error ? err.message : t('login.failedToStartGuest'),
        color: 'red',
      })
      setGuestLoading(false)
    }
  }

  async function handleLogin() {
    setLoading(true)
    try {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      const state = crypto.randomUUID()

      sessionStorage.setItem('oauth_code_verifier', verifier)
      sessionStorage.setItem('oauth_state', state)

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: oauthConfig.clientId,
        redirect_uri: oauthConfig.redirectUri,
        scope: oauthConfig.scopes,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })

      window.location.href = `${oauthConfig.authorizeUrl}?${params.toString()}`
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error ? err.message : t('login.failedToStartLogin'),
        color: 'red',
      })
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 p-4 dark:bg-linear-to-br dark:from-slate-950 dark:to-slate-900">
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <span className="sm:hidden">
          <LanguageSwitcher compact />
        </span>
        <span className="hidden sm:block">
          <LanguageSwitcher />
        </span>
        <ThemeToggle />
      </div>
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/8 absolute -top-40 -right-40 size-96 rounded-full blur-3xl" />
        <div className="bg-primary/6 absolute -bottom-40 -left-40 size-96 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-5">
        {/* Brand */}
        <div className="text-center">
          <div className="bg-primary shadow-primary/30 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl shadow-lg">
            <ParkingCircle className="text-primary-foreground size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ParkFlow</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('login.tagline')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card flex flex-col items-center rounded-2xl border p-6 shadow-lg shadow-black/5">
          <div className="flex w-56 flex-col gap-2">
            <Button
              className="w-full gap-2"
              disabled={loading || guestLoading}
              onClick={() => void handleLogin()}
            >
              <LogIn className="size-4" />
              {loading ? t('login.redirecting') : t('login.signInWithSSO')}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={loading || guestLoading}
              onClick={() => void handleGuest()}
            >
              <UserRound className="size-4" />
              {guestLoading
                ? t('login.redirecting')
                : t('login.continueAsGuest')}
            </Button>
          </div>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            {t('login.ssoNote')}
          </p>
          <p className="text-muted-foreground/80 mt-1 text-center text-[11px]">
            {t('login.guestNote')}
          </p>
        </div>

        {/* Feature tiles */}
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
          {FEATURE_CONFIG.map(({ Icon, labelKey, descKey, color, bg }) => (
            <div
              key={labelKey}
              className="bg-card/70 flex flex-row items-start gap-3 rounded-xl border p-3.5 backdrop-blur-sm min-[400px]:flex-col min-[400px]:gap-2.5"
            >
              <div
                className={`flex size-7 items-center justify-center rounded-lg ${bg}`}
              >
                <Icon className={`size-3.5 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-medium">{t(labelKey)}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                  {t(descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
