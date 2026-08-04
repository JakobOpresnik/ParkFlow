/**
 * presencePoll.ts
 *
 * The AI uprava timesheet API is REST-only — it has no push channel yet, so the
 * near-instant updates the Abelium Action Cable connection used to give us are
 * replaced by polling once a minute. (lib/timesheetWs.ts is kept, dormant, for
 * when a WebSocket does appear.)
 *
 * Each tick refreshes the presence cache, persists employee identity onto owner
 * rows, and emits an SSE `spot_change` only when parking availability actually
 * changed — clients re-fetch on that event, so broadcasting an unchanged week
 * would make every connected client refetch for nothing.
 */

import { broadcast } from './broadcast.js'
import { ljubljanaDate } from './localDate.js'
import { syncOwnersFromTimesheet } from './ownerSync.js'
import { fetchWeekPresence } from './presence.js'
import type { WeekPresenceResponse } from './presence.types.js'

// 0 disables polling — useful for local dev off the company VPN, where every
// tick would otherwise log a connection failure.
const POLL_MS = Number(process.env.PRESENCE_POLL_MS ?? 60_000)

/** What clients render: per-employee day availability plus holidays. */
export function availabilityFingerprint(p: WeekPresenceResponse): string {
  const employees = p.employees
    .map(
      (e) =>
        `${e.user_id}:` +
        e.week
          .map(
            (d) =>
              `${d.date}=${d.parking_available ? 1 : 0}${d.is_work_free_day ? 'H' : ''}`,
          )
          .join(','),
    )
    .sort()
  return [...employees, `wfd=${[...p.work_free_days].sort().join(',')}`].join(
    '|',
  )
}

/** What gets persisted onto owner rows (see lib/ownerSync.ts). */
export function identityFingerprint(p: WeekPresenceResponse): string {
  return p.employees
    .map(
      (e) => `${e.user_id}:${e.name}:${e.email ?? ''}:${e.parking_spot ?? ''}`,
    )
    .sort()
    .join('|')
}

let lastAvailability = ''
let lastIdentity = ''

async function poll(): Promise<void> {
  // fresh: true so the poll bypasses (and refreshes) the 30-minute presence
  // cache. A failed fetch leaves the last good data in place.
  const presence = await fetchWeekPresence(ljubljanaDate(new Date()), {
    fresh: true,
  })

  const identity = identityFingerprint(presence)
  if (identity !== lastIdentity) {
    lastIdentity = identity
    await syncOwnersFromTimesheet(presence.employees)
  }

  const availability = availabilityFingerprint(presence)
  if (availability === lastAvailability) return
  // First successful poll: seed the baseline without broadcasting — clients
  // fetch presence on load anyway, nothing has changed for them yet.
  const isFirstPoll = lastAvailability === ''
  lastAvailability = availability
  if (!isFirstPoll) {
    console.log('[presencePoll] parking availability changed — broadcasting')
    broadcast('spot_change')
  }
}

export function startPresencePolling(): void {
  if (!Number.isFinite(POLL_MS) || POLL_MS <= 0) {
    console.log('[presencePoll] disabled (PRESENCE_POLL_MS=0)')
    return
  }

  const run = (): void => {
    poll().catch((err) =>
      console.error(
        '[presencePoll] poll failed:',
        err instanceof Error ? err.message : err,
      ),
    )
  }

  run()
  setInterval(run, POLL_MS)
  console.log(`[presencePoll] polling timesheet every ${POLL_MS}ms`)
}
