import type { OwnerSpot } from '@/types'

// — types —

export type DayStatus = 'free' | 'occupied' | 'reserved'

export interface WeekStripProps {
  readonly days: string[]
  readonly today: string
  readonly selectedDate: string
  readonly onSelect: (date: string) => void
  readonly workFreeDays: string[]
}

export interface SpotCardProps {
  readonly spot: OwnerSpot
  readonly status: DayStatus
  readonly isOverridden: boolean
  readonly isNonWorkDay: boolean
  readonly isPastCutoff: boolean
  readonly switchedToSpotNumber?: number
  readonly onSetDayStatus: (s: 'free' | 'occupied') => void
  readonly onClearOverride: () => void
  readonly onCancelBooking: () => void
  readonly onToggleHistory: () => void
  readonly isHistoryOpen: boolean
  readonly isToggling: boolean
  readonly isCancelling: boolean
}

export interface BookingHistoryProps {
  readonly spotId: string
  readonly spotNumber: number
  readonly onClose: () => void
}
