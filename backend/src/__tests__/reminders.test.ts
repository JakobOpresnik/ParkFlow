import { describe, expect, it } from 'vitest'

import { isReminderType, REMINDER_TYPES } from '../lib/reminders.js'

describe('reminder catalog', () => {
  it('includes the morning reminder type', () => {
    expect(REMINDER_TYPES.some((r) => r.type === 'reservation_today')).toBe(true)
  })

  it('validates known/unknown types', () => {
    expect(isReminderType('reservation_today')).toBe(true)
    expect(isReminderType('nope')).toBe(false)
  })
})
