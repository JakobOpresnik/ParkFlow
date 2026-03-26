import { useEffect, useRef } from 'react'

import { invalidateAllSpotQueries } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const RECONNECT_DELAY_MS = 3_000

/**
 * Opens an SSE connection to the backend.
 * On every `spot_change` event, invalidates all parking queries
 * so the UI reflects changes made by other users in real time.
 */
export function useRealtimeSync() {
  const token = useAuthStore((s) => s.accessToken)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!token) return

    let es: EventSource | null = null
    let closed = false
    let debounceTimer: ReturnType<typeof setTimeout> | undefined

    function connect() {
      if (closed) return

      // EventSource doesn't support Authorization headers natively,
      // so pass the token as a query parameter.
      es = new EventSource(
        `${BASE_URL}/api/subscribe?token=${encodeURIComponent(token!)}`,
      )

      es.addEventListener('spot_change', () => {
        // Debounce: if multiple changes arrive in quick succession
        // (e.g. admin bulk-edits), collapse into a single re-fetch.
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(invalidateAllSpotQueries, 300)
      })

      es.onerror = () => {
        es?.close()
        es = null
        if (!closed) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      closed = true
      es?.close()
      clearTimeout(reconnectTimer.current)
      clearTimeout(debounceTimer)
    }
  }, [token])
}
