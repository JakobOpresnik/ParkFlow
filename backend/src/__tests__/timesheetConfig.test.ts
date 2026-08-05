// deploy_env writes every key present in .env.example, so an unset CI/CD variable
// reaches the app as an EMPTY STRING, not as undefined. `??` keeps empty strings, so
// each of these would have silently mis-configured prod: a blank base URL 500s every
// presence call, and Number('') === 0 turns the poller off.

import { afterEach, describe, expect, it, vi } from 'vitest'

const DEFAULT_URL = 'https://ai-uprava.matheo.si/api/v1/timesheet'

async function loadPresence(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  return import('../lib/presence.js')
}

afterEach(() => {
  delete process.env.TIMESHEET_API_URL
  delete process.env.TIMESHEET_API_TOKEN
  delete process.env.PRESENCE_POLL_MS
  vi.resetModules()
})

describe('TIMESHEET_BASE_URL', () => {
  it('falls back to the default when the variable is unset', async () => {
    const m = await loadPresence({ TIMESHEET_API_URL: undefined })
    expect(m.TIMESHEET_BASE_URL).toBe(DEFAULT_URL)
  })

  it('falls back when the variable is empty (the deploy_env case)', async () => {
    const m = await loadPresence({ TIMESHEET_API_URL: '' })
    expect(m.TIMESHEET_BASE_URL).toBe(DEFAULT_URL)
  })

  it('falls back when the variable is only whitespace', async () => {
    const m = await loadPresence({ TIMESHEET_API_URL: '   ' })
    expect(m.TIMESHEET_BASE_URL).toBe(DEFAULT_URL)
  })

  it('honours a real override', async () => {
    const m = await loadPresence({
      TIMESHEET_API_URL: 'https://example.test/api',
    })
    expect(m.TIMESHEET_BASE_URL).toBe('https://example.test/api')
  })
})

describe('timesheetApiToken', () => {
  it('treats empty and whitespace as not configured', async () => {
    let m = await loadPresence({ TIMESHEET_API_TOKEN: '' })
    expect(m.timesheetApiToken()).toBe('')
    m = await loadPresence({ TIMESHEET_API_TOKEN: '  ' })
    expect(m.timesheetApiToken()).toBe('')
  })

  it('trims a real token so a stray newline cannot corrupt the header', async () => {
    const m = await loadPresence({ TIMESHEET_API_TOKEN: ' abc123\n' })
    expect(m.timesheetApiToken()).toBe('abc123')
  })
})

describe('presence poll interval', () => {
  // Returns what startPresencePolling logged, which is where the resolved interval
  // shows up. Fake timers so the registered setInterval can't keep vitest alive, and
  // the immediate first poll (which fails without a token) stays quiet.
  async function runPoll(value: string | undefined): Promise<string> {
    vi.resetModules()
    vi.doMock('../db/pool.js', () => ({
      pool: { query: vi.fn(), connect: vi.fn() },
    }))
    if (value === undefined) delete process.env.PRESENCE_POLL_MS
    else process.env.PRESENCE_POLL_MS = value

    vi.useFakeTimers()
    const logs: string[] = []
    const log = vi.spyOn(console, 'log').mockImplementation((m) => {
      logs.push(String(m))
    })
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { startPresencePolling } = await import('../lib/presencePoll.js')
    startPresencePolling()

    log.mockRestore()
    err.mockRestore()
    vi.useRealTimers()
    return logs.join(' ')
  }

  it('uses 60s when the variable is empty, rather than disabling itself', async () => {
    const out = await runPoll('')
    expect(out).toContain('every 60000ms')
    expect(out).not.toContain('disabled')
  })

  it('uses 60s when the variable is unset', async () => {
    const out = await runPoll(undefined)
    expect(out).toContain('every 60000ms')
  })

  it('still honours an explicit 0 as "disabled"', async () => {
    expect(await runPoll('0')).toContain('disabled')
  })
})
