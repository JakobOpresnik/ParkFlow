import { useState } from 'react'
import { ParkingCircle, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { oauthConfig } from '@/lib/oauth'
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce'
import { notifications } from '@mantine/notifications'

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
    <div className="bg-muted/40 flex min-h-screen items-center justify-center overflow-y-auto p-4">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-md sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <ParkingCircle className="text-primary size-10" />
          <h1 className="text-xl font-semibold">ParkFlow</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to book a parking spot
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            className="gap-2"
            disabled={loading}
            onClick={() => void handleLogin()}
          >
            <LogIn className="size-4" />
            {loading ? 'Redirecting…' : 'Sign in with SSO'}
          </Button>
        </div>
      </div>
    </div>
  )
}
