import { describe, expect, it } from 'vitest'

import { REMINDER_TYPES } from '../lib/reminders.js'

describe('reminder catalog', () => {
  it('includes the morning reminder type', () => {
    expect(REMINDER_TYPES.some((r) => r.type === 'reservation_today')).toBe(
      true,
    )
  })
})
