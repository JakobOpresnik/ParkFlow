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
  {
    type: 'owner_release_spot',
    label: 'Free-your-spot reminder',
    description:
      'Remind me in the afternoon to free my owned parking spot when I won’t need it.',
  },
  // Future: { type: 'reservation_ending', label: 'Expiry warning', ... }
]
