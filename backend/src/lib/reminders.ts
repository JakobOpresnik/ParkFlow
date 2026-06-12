// Single source of truth for scheduled reminder types. Consumed by the
// scheduler, the /api/notifications/prefs endpoints, and the /reminders bot
// command. Add a type here AND wire its ticker rule before shipping it.
export interface ReminderTypeDef {
  type: string
  label: string
  description: string
}

export const REMINDER_TYPES: readonly ReminderTypeDef[] = [
  {
    type: 'reservation_today',
    label: 'Morning reminder',
    description: 'Notify me in the morning when I have a reservation today.',
  },
  // Future: { type: 'reservation_ending', label: 'Expiry warning', ... }
]

export function isReminderType(value: string): boolean {
  return REMINDER_TYPES.some((rt) => rt.type === value)
}
