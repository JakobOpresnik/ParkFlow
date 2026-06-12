import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}))
vi.mock('../lib/rocketchatNotify.js', () => ({
  pushChatMessage: vi.fn(),
}))

const { pool } = await import('../db/pool.js')
const { pushChatMessage } = await import('../lib/rocketchatNotify.js')
const { runReminderTick } = await import('../lib/reminderScheduler.js')

const mockConnect = pool.connect as ReturnType<typeof vi.fn>
const mockPush = pushChatMessage as ReturnType<typeof vi.fn>

const due = {
  booking_id: 'b1',
  user_id: 'jsernec',
  spot_id: 's1',
  spot_label: 'A1',
  floor: 'P1',
  expires_at: '2026-06-12T15:00:00.000Z',
}

beforeEach(() => vi.resetAllMocks())

describe('runReminderTick', () => {
  it('inserts a reminder and pushes a DM for a due booking', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ok: true }] }) // advisory lock
        .mockResolvedValueOnce({ rows: [due] }) // candidates
        .mockResolvedValueOnce({ rows: [{ id: 'n1' }] }) // insert
        .mockResolvedValueOnce({ rows: [] }) // pushed_at update
        .mockResolvedValueOnce({ rows: [] }), // advisory unlock
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)
    mockPush.mockResolvedValue(true)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining(['jsernec']),
    )
    expect(mockPush).toHaveBeenCalledWith('jsernec', expect.stringContaining('A1'))
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('pushed_at = now()'),
      ['n1'],
    )
    expect(client.release).toHaveBeenCalled()
  })

  it('does nothing when the advisory lock is held by another tick', async () => {
    const client = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ ok: false }] }),
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    expect(client.query).toHaveBeenCalledTimes(1) // only the lock attempt
    expect(mockPush).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalled()
  })

  it('keeps the notification when the DM push fails (no pushed_at)', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ok: true }] })
        .mockResolvedValueOnce({ rows: [due] })
        .mockResolvedValueOnce({ rows: [{ id: 'n1' }] })
        .mockResolvedValueOnce({ rows: [] }), // unlock (no pushed_at update)
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)
    mockPush.mockResolvedValue(false)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('pushed_at = now()'),
      expect.anything(),
    )
    expect(client.release).toHaveBeenCalled()
  })

  it('selects only active bookings, dedups, and respects opt-out (SQL shape)', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ok: true }] })
        .mockResolvedValueOnce({ rows: [] }) // no candidates
        .mockResolvedValueOnce({ rows: [] }), // unlock
      release: vi.fn(),
    }
    mockConnect.mockResolvedValue(client)

    await runReminderTick(new Date('2026-06-12T06:00:00.000Z'))

    const selectSql = client.query.mock.calls[1]?.[0] as string
    expect(selectSql).toContain("status = 'active'")
    expect(selectSql).toContain('AT TIME ZONE')
    expect(selectSql).toContain('NOT EXISTS')
    expect(selectSql).toContain('notification_prefs')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
