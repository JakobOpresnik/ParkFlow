import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pushChatMessage } from '../lib/rocketchatNotify.js'

const URL = 'https://rc.example/hooks/abc/def'

beforeEach(() => {
  vi.restoreAllMocks()
  process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL = URL
})
afterEach(() => {
  delete process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL
})

describe('pushChatMessage', () => {
  it('POSTs a DM to @handle and returns true on ok', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))

    const ok = await pushChatMessage('jsernec', 'hello')

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ channel: '@jsernec', text: 'hello' }),
      }),
    )
  })

  it('returns false (no fetch) when the webhook env is unset', async () => {
    delete process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const ok = await pushChatMessage('jsernec', 'hi')
    expect(ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false when handle is empty', async () => {
    const ok = await pushChatMessage('', 'hi')
    expect(ok).toBe(false)
  })

  it('returns false and swallows a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'))
    const ok = await pushChatMessage('jsernec', 'hi')
    expect(ok).toBe(false)
  })
})
