export type SpotStatus =
  | 'free'
  | 'occupied'
  | 'reserved'
  | 'unconfirmed'
  | 'spotted'
export type SpotType = 'standard' | 'ev' | 'handicap' | 'compact'

export interface StatsHeatmapCell {
  weekday: number
  hour: number
  count: number
}

export interface StatsDailyPoint {
  date: string
  count: number
}

export interface StatsHistory {
  heatmap: StatsHeatmapCell[]
  daily: StatsDailyPoint[]
}

export type Role = 'admin' | 'user' | 'guest'

export interface AppUser {
  id: string
  username: string
  displayName: string
  role: Role
}

export type BookingStatus = 'active' | 'cancelled' | 'expired'

export interface Booking {
  id: string
  status: BookingStatus
  booked_at: string
  starts_at: string | null
  expires_at: string
  // Local (Europe/Ljubljana) calendar day the booking is for — the authoritative
  // day key. Use this instead of slicing expires_at, whose UTC date can roll.
  booking_date: string
  ended_at: string | null
  cancelled_by: string | null
  spot_id: string
  spot_number: number
  spot_label: string | null
  spot_floor: string
}

export interface Owner {
  id: string
  name: string
  email: string | null
  phone: string | null
  vehicle_plate: string | null
  notes: string | null
  user_id: string | null
  created_at: string
}

export interface ParkingLot {
  id: string
  name: string
  description: string | null
  image_filename: string
  image_width: number
  image_height: number
  sort_order: number
  created_at: string
}

export interface Spot {
  id: string
  number: number
  label: string | null
  floor: string
  lot_id: string | null
  status: SpotStatus
  type: SpotType
  owner_id: string | null
  coordinates: SpotCoordinates | null
  created_at: string
  // joined from owners table
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_vehicle_plate: string | null
  owner_user_id: string | null
  // set by useEffectiveSpots: which specific owner is in office (for shared spots)
  in_office_owner?: string | null
  // set by useEffectiveSpots for shared spots where 2+ co-owners are flagged as
  // coming (PP signal ambiguous) — lists all candidates so the UI can show them.
  possible_occupiers?: string[] | null
  // set by useEffectiveSpots: co-owners whose presence resolves to 'absent' for
  // the selected date — UI flags them with a "not in office" badge so users can
  // see which co-owners are confirmed away on a shared spot.
  away_owners?: string[] | null
  // Guest-only index-based mirrors of in_office_owner / possible_occupiers /
  // away_owners. For guest viewers, the name-based fields above are nulled and
  // these index fields (positions into owner_name.split('/')) are populated
  // instead — so React state and DevTools never expose real co-owner names.
  in_office_owner_index?: number | null
  possible_occupier_indices?: number[] | null
  away_owner_indices?: number[] | null
  // joined from bookings table (active booking for this spot, if any)
  active_booking_id: string | null
  active_booking_user_id: string | null
  active_booking_reserved_by: string | null
  active_booking_starts_at: string | null
  active_booking_expires_at: string | null
  // Local (Europe/Ljubljana) day the active booking is for — the authoritative
  // day key. Compare against the selected date instead of slicing expires_at.
  active_booking_date: string | null
  active_booking_booked_by_owner: boolean | null
  // active user "this spot is taken" report (if any) — reporter name is not exposed
  spotted_reported_at: string | null
  spotted_expires_at: string | null
}

export type SpotChangeType =
  | 'owner_assigned'
  | 'owner_unassigned'
  | 'status_changed'
  | 'type_changed'

export interface SpotChange {
  id: string
  spot_id: string
  change_type: SpotChangeType
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: string
  spot_number: number
  spot_label: string | null
  spot_lot_id: string | null
  lot_name: string | null
}

export const PRESENCE_STATUSES = [
  'in_office',
  'remote',
  'sick',
  'care',
  'vacation',
  'no_entry',
] as const

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number]

export interface PresenceDayEntry {
  date: string
  // Only returned to admins — the leave/health reason is stripped for everyone
  // else by the backend, so it's optional here. The UI reads parking_available.
  status?: PresenceStatus
  is_work_free_day: boolean
  parking_available: boolean
}

export interface EmployeePresence {
  user_id: number
  name: string
  week: PresenceDayEntry[]
}

export interface PresenceResponse {
  employees: EmployeePresence[]
  work_free_days: string[]
}

export interface OwnerSpot {
  id: string
  number: number
  label: string | null
  floor: string
  lot_id: string | null
  status: SpotStatus
  coordinates: SpotCoordinates | null
  created_at: string
  owner_id: string
  owner_name: string
  lot_name: string | null
  active_booking_id: string | null
  active_booking_user_id: string | null
  active_booking_reserved_by: string | null
  active_booking_starts_at: string | null
  active_booking_expires_at: string | null
  active_booking_date: string | null
  active_booking_booked_by_owner: boolean | null
}

export interface SpotDayOverride {
  id: string
  spot_id: string
  date: string
  status: 'free' | 'occupied'
  set_by: string | null
}

export interface OwnerWeekBooking {
  id: string
  spot_id: string
  status: BookingStatus
  reserved_by: string | null
  booked_at: string
  starts_at: string | null
  expires_at: string
  booking_date: string
  ended_at: string | null
  cancelled_by: string | null
}

export interface SpotBooking {
  id: string
  status: BookingStatus
  reserved_by: string | null
  booked_at: string
  starts_at: string | null
  expires_at: string
  ended_at: string | null
  cancelled_by: string | null
  user_id: string
}

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'improvement'
export type FeedbackStatus =
  | 'open'
  | 'in_progress'
  | 'done'
  | 'dismissed'
  | 'archived'

export interface FeatureRequest {
  id: string
  user_id: string
  display_name: string
  title: string
  description: string
  category: FeedbackCategory
  status: FeedbackStatus
  created_at: string
}

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  created_at: string
  read_at: string | null
  pushed_at: string | null
}

export type LabelPosition = 'top' | 'bottom' | 'left' | 'right'

export interface SpotCoordinates {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  labelPosition: LabelPosition
  labelRotation: number
}
