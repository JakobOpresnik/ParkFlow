export type AttendanceStatus = 'In-Office' | 'Remote' | 'Sick' | 'Vacation'

export type SpotStatus = 'occupied' | 'available' | 'reserved' | 'unavailable'

export type SpotType = 'standard' | 'ev' | 'handicap' | 'compact'

export type FloorId = 'B1' | 'B2' | 'B3'

export interface Employee {
  id: string
  name: string
  email: string
  department: string
  avatar?: string
}

export interface PermanentSpot {
  spotId: string
  floor: FloorId
  ownerId: string
  ownerName: string
  type: SpotType
}

export interface AttendanceRecord {
  employeeId: string
  employeeName: string
  status: AttendanceStatus
  date: string
}

export interface ParkingSpot {
  id: string
  floor: FloorId
  label: string
  row: number
  col: number
  type: SpotType
  status: SpotStatus
  permanentOwner?: string
  permanentOwnerId?: string
  reservedBy?: string
  reservedById?: string
  orientation: 'up' | 'down' | 'left' | 'right'
}

export interface Reservation {
  id: string
  spotId: string
  employeeId: string
  employeeName: string
  date: string
  floor: FloorId
}

export interface Notification {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
}

export interface WeeklyOccupancy {
  day: string
  occupancy: number
  total: number
  percentage: number
}

export type ActivityEventType =
  | 'parked'
  | 'available'
  | 'reserved'
  | 'cancelled'
  | 'alert'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  message: string
  timestamp: number
}

export type SpotHeatmapData = Record<string, number>

export interface ReasonTag {
  label: string
  color: string
  icon: 'floor' | 'elevator' | 'reliable' | 'ev' | 'compact'
}

export interface SuggestedSpot {
  spot: ParkingSpot
  score: number
  reasons: ReasonTag[]
}
