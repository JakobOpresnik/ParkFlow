import { notifications } from '@mantine/notifications'
import { BarChart2, Calendar, LogIn, Map, ParkingCircle } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { oauthConfig } from '@/lib/oauth'
import { generateCodeChallenge, generateCodeVerifier } from '@/lib/pkce'

const FEATURES = [
  {
    Icon: Map,
    label: 'Live map',
    desc: 'Real-time spot availability',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    Icon: Calendar,
    label: 'Reservations',
    desc: 'Book your spot ahead',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    Icon: BarChart2,
    label: 'Analytics',
    desc: 'Occupancy & usage trends',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
]

export function LoginPage() {
  const [loading, setLoading] = useState(false)

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
        message: err instanceof Error ? err.message : 'Failed to start login',
        color: 'red',
      })
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 p-4 dark:bg-linear-to-br dark:from-slate-950 dark:to-slate-900">
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
            Smart parking for your team
          </p>
        </div>

        {/* Card */}
        <div className="bg-card flex flex-col items-center rounded-2xl border p-6 shadow-lg shadow-black/5">
          <Button
            className="gap-2"
            disabled={loading}
            onClick={() => void handleLogin()}
          >
            <LogIn className="size-4" />
            {loading ? 'Redirecting…' : 'Sign in with SSO'}
          </Button>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Single sign-on via your company account
          </p>
        </div>

        {/* Feature tiles */}
        <div className="grid grid-cols-3 gap-2">
          {FEATURES.map(({ Icon, label, desc, color, bg }) => (
            <div
              key={label}
              className="bg-card/70 flex flex-col gap-2.5 rounded-xl border p-3.5 backdrop-blur-sm"
            >
              <div
                className={`flex size-7 items-center justify-center rounded-lg ${bg}`}
              >
                <Icon className={`size-3.5 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
