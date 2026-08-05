// No push channel yet, so poll once a minute: refresh the cache, sync owner rows,
// and broadcast only on a real availability change (clients re-fetch on that).

import { broadcast } from './broadcast.js'
import { envOr } from './env.js'
import { ljubljanaDate } from './localDate.js'
import { syncOwnersFromTimesheet } from './ownerSync.js'
import { fetchWeekPresence } from './presence.js'
import type { WeekPresenceResponse } from './presence.types.js'

// 0 disables polling — for local dev off the VPN, where every tick would fail.
// envOr keeps an empty deploy value from reading as Number('') === 0, i.e. "off".
const POLL_MS = Number(envOr('PRESENCE_POLL_MS', '60000'))

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

let lastAvailability = ''

async function poll(): Promise<void> {
  // fresh: bypass and refresh the cache; a failed fetch keeps the last good data.
  const presence = await fetchWeekPresence(ljubljanaDate(new Date()), {
    fresh: true,
  })

  // Every tick, not only when the roster changes: the timesheet is authoritative for
  // spot ownership, so an admin edit in between has to be reconciled too. Writes only
  // happen when something actually differs.
  const sync = await syncOwnersFromTimesheet(presence.employees)
  let changed = sync.reassigned.length > 0

  const availability = availabilityFingerprint(presence)
  if (availability !== lastAvailability) {
    // First poll just seeds the baseline — clients fetch on load anyway.
    if (lastAvailability !== '') changed = true
    lastAvailability = availability
  }

  if (changed) {
    console.log('[presencePoll] spots changed — broadcasting')
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
