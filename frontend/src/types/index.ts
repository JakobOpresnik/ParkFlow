export type SpotStatus = 'free' | 'occupied' | 'reserved'

export interface AppUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'user'
}

export type BookingStatus = 'active' | 'cancelled' | 'expired'

export interface Booking {
  id: string
  status: BookingStatus
  booked_at: string
  expires_at: string
  ended_at: string | null
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
  owner_id: string | null
  coordinates: SpotCoordinates | null
  created_at: string
  // joined from owners table
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_vehicle_plate: string | null
  // joined from bookings table (active booking for this spot, if any)
  active_booking_id: string | null
  active_booking_user_id: string | null
}

export type SpotChangeType =
  | 'owner_assigned'
  | 'owner_unassigned'
  | 'status_changed'

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

export interface EmployeePresence {
  user_id: number
  name: string
  status: PresenceStatus
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
