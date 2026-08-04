// DORMANT — nothing starts this; presencePoll.ts polls instead. To revive: set
// TIMESHEET_WS_URL, call startTimesheetWs(), re-check the Action Cable framing.

import { broadcast } from './broadcast.js'
import {
  setPresenceCacheFromWs,
  TIMESHEET_WS_URL,
  timesheetApiToken,
  updatePresenceCacheEmployee,
} from './presence.js'
import type {
  EmployeeWeekPresence,
  PresenceDayEntry,
} from './presence.types.js'

// ─── Internal types for WS message shapes ────────────────────────────────────

interface WsUserPayload {
  user_id: number
  name: string
  data: PresenceDayEntry[]
}

interface WsChannelMessage {
  type: 'initial' | 'update'
  payload: WsUserPayload[] | WsUserPayload
}

interface AcMessage {
  type?:
    | 'welcome'
    | 'ping'
    | 'confirm_subscription'
    | 'reject_subscription'
    | 'disconnect'
  identifier?: string
  message?: WsChannelMessage
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CHANNEL = 'Api::ParkingChannel'
const CHANNEL_IDENTIFIER = JSON.stringify({ channel: CHANNEL })
/**
 * If no ping received for this long the TCP connection is assumed dead.
 * Pings arrive every ~3 s, so 30 s = 10 consecutive missed pings.
 */
const PING_TIMEOUT_MS = 30_000
const CONNECT_TIMEOUT_MS = 15_000
const BASE_RECONNECT_MS = 3_000
const MAX_RECONNECT_MS = 60_000

// ─── State ────────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null
let pingTimer: ReturnType<typeof setTimeout> | null = null
let connectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let consecutiveFailures = 0
let stopped = false
let isPlannedClose = false

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearPingTimer() {
  if (pingTimer) {
    clearTimeout(pingTimer)
    pingTimer = null
  }
}

function clearConnectTimer() {
  if (connectTimer) {
    clearTimeout(connectTimer)
    connectTimer = null
  }
}

function scheduleReconnect() {
  clearPingTimer()
  if (stopped) return
  const delay = Math.min(
    BASE_RECONNECT_MS * Math.pow(2, consecutiveFailures),
    MAX_RECONNECT_MS,
  )
  console.log(`[timesheetWs] reconnecting in ${delay}ms…`)
  reconnectTimer = setTimeout(connect, delay)
}

function resetPingTimer() {
  clearPingTimer()
  pingTimer = setTimeout(() => {
    console.warn('[timesheetWs] ping timeout — reconnecting')
    isPlannedClose = true
    ws?.close()
  }, PING_TIMEOUT_MS)
}

function buildEmployee(
  userId: number,
  name: string,
  days: PresenceDayEntry[],
): EmployeeWeekPresence {
  return {
    user_id: userId,
    // The WS payload carries neither; owner rows get these from the REST sync.
    email: null,
    parking_spot: null,
    name,
    week: days.map(
      (d): PresenceDayEntry => ({
        date: d.date,
        status: d.status,
        is_work_free_day: d.is_work_free_day,
        parking_available: d.parking_available ?? false,
      }),
    ),
  }
}

// ─── Message handler ─────────────────────────────────────────────────────────

async function handleMessage(raw: string) {
  let msg: AcMessage
  try {
    msg = JSON.parse(raw) as AcMessage
  } catch {
    return
  }

  if (msg.type === 'welcome') {
    ws?.send(
      JSON.stringify({ command: 'subscribe', identifier: CHANNEL_IDENTIFIER }),
    )
    return
  }

  if (msg.type === 'ping') {
    resetPingTimer()
    return
  }

  if (msg.type === 'confirm_subscription') {
    console.log('[timesheetWs] subscribed to', CHANNEL)
    consecutiveFailures = 0
    return
  }

  if (msg.type === 'reject_subscription' || msg.type === 'disconnect') {
    console.warn('[timesheetWs] rejected/disconnected — reconnecting')
    isPlannedClose = true
    ws?.close()
    return
  }

  if (!msg.message) return

  const { type, payload } = msg.message

  if (type === 'initial') {
    const items = payload as WsUserPayload[]
    const employees = items.map((item) =>
      buildEmployee(item.user_id, item.name, item.data ?? []),
    )
    setPresenceCacheFromWs(employees)
    console.log(`[timesheetWs] initial: cached ${employees.length} employees`)
    broadcast('spot_change')
    return
  }

  if (type === 'update') {
    const { user_id, name, data } = payload as WsUserPayload
    if (user_id == null || !name || !data?.length) return
    updatePresenceCacheEmployee(buildEmployee(user_id, name, data))
    console.log(`[timesheetWs] PP update: ${name} (user_id=${user_id})`)
    console.log(
      `[timesheetWs] parking availability:\n${data.map((d) => `${d.date}=${d.parking_available}`).join(',\n')}`,
    )
    broadcast('spot_change')
    return
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────

async function connect() {
  if (stopped) return

  if (!TIMESHEET_WS_URL) {
    console.warn('[timesheetWs] TIMESHEET_WS_URL is unset — not connecting')
    return
  }

  const token = timesheetApiToken()
  if (!token) {
    console.error('[timesheetWs] TIMESHEET_API_TOKEN is not configured')
    consecutiveFailures++
    scheduleReconnect()
    return
  }

  const url = `${TIMESHEET_WS_URL}?access_token=${encodeURIComponent(token)}`
  ws = new WebSocket(url)

  connectTimer = setTimeout(() => {
    console.warn('[timesheetWs] connect timeout — reconnecting')
    ws?.close()
  }, CONNECT_TIMEOUT_MS)

  ws.onopen = () => {
    clearConnectTimer()
    console.log('[timesheetWs] connected')
    resetPingTimer()
  }

  ws.onmessage = (event) => {
    handleMessage(
      typeof event.data === 'string' ? event.data : String(event.data),
    ).catch((err) => console.error('[timesheetWs] handleMessage error:', err))
  }

  ws.onerror = (event) => {
    console.error(
      '[timesheetWs] error:',
      (event as ErrorEvent).message ?? event.type,
    )
  }

  ws.onclose = (event) => {
    clearConnectTimer()
    clearPingTimer()
    console.log(`[timesheetWs] closed (${event.code})`)
    if (!stopped) {
      if (isPlannedClose) {
        isPlannedClose = false
        reconnectTimer = setTimeout(connect, BASE_RECONNECT_MS)
      } else {
        consecutiveFailures++
        scheduleReconnect()
      }
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startTimesheetWs(): void {
  stopped = false
  connect().catch((err) => console.error('[timesheetWs] connect error:', err))
}

export function stopTimesheetWs(): void {
  stopped = true
  clearConnectTimer()
  clearPingTimer()
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
  ws = null
}
