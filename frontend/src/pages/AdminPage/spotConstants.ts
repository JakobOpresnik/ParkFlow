import type { Spot, SpotStatus, SpotType } from '@/types'

// — constants —

export const StatusClass: Record<SpotStatus, string> = {
  free: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  occupied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  reserved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  unconfirmed:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  spotted:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export const SpotTypeConfig: Record<
  SpotType,
  { readonly label: string; readonly badgeClass: string | null }
> = {
  standard: { label: 'Standard', badgeClass: null },
  ev: {
    label: 'EV Charging',
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  handicap: {
    label: 'Handicap',
    badgeClass:
      'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  compact: { label: 'Compact', badgeClass: 'bg-muted text-muted-foreground' },
}

export const STICKY_ACTIONS_CLASS =
  "bg-card before:bg-border sticky right-0 before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100"

// — helpers —

// The admin spots list shows the raw API status, but the API forces ACEX spots
// to 'free' regardless of any reservation (see SPOT_SELECT). So an active
// booking would otherwise be invisible here. Surface it: any spot with an
// active booking is shown as 'reserved'.
export function adminSpotStatus(
  spot: Pick<Spot, 'status' | 'active_booking_id'>,
): SpotStatus {
  return spot.active_booking_id ? 'reserved' : spot.status
}

export function buildPillClass(active: boolean): string {
  return `cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'text-muted-foreground border-border hover:text-foreground'
  }`
}
