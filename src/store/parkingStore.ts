import { create } from 'zustand'
import type {
  FloorId,
  ParkingSpot,
  Reservation,
  AttendanceRecord,
  PermanentSpot,
} from '@/types'
import { useActivityFeedStore } from '@/store/activityFeedStore'
import permanentSpotsData from '@/data/permanent_spots.json'
import attendanceData from '@/data/attendance.json'
import parkingLayout from '@/data/parking_layout.json'

const CURRENT_USER_ID = 'emp-020'
const CURRENT_USER_NAME = 'Alex Morgan'

interface ParkingState {
  currentFloor: FloorId
  preferredFloor: FloorId
  currentUserId: string
  currentUserName: string
  reservations: Reservation[]
  spots: ParkingSpot[]
  setFloor: (floor: FloorId) => void
  setPreferredFloor: (floor: FloorId) => void
  reserveSpot: (spotId: string) => void
  reserveSpotOnFloor: (spotId: string, floor: FloorId) => void
  cancelReservation: (spotId: string) => void
  getAllSpots: () => ParkingSpot[]
  getFloorStats: (floor: FloorId) => {
    total: number
    filled: number
    available: number
    reserved: number
  }
}

function computeSpots(
  floor: FloorId,
  reservations: Reservation[],
): ParkingSpot[] {
  const layout =
    parkingLayout[floor as keyof typeof parkingLayout] ?? parkingLayout.B1
  const permanentSpots = permanentSpotsData as PermanentSpot[]
  const attendance = attendanceData as AttendanceRecord[]

  const permanentMap = new Map(
    permanentSpots.filter((s) => s.floor === floor).map((s) => [s.spotId, s]),
  )
  const attendanceMap = new Map(attendance.map((a) => [a.employeeId, a.status]))
  const reservationMap = new Map(
    reservations.filter((r) => r.floor === floor).map((r) => [r.spotId, r]),
  )

  return layout.spots.map((spot) => {
    const permanent = permanentMap.get(spot.id)
    const reservation = reservationMap.get(spot.id)

    let status: ParkingSpot['status'] = 'available'
    let permanentOwner: string | undefined
    let permanentOwnerId: string | undefined
    let reservedBy: string | undefined
    let reservedById: string | undefined

    if (spot.type === 'handicap') {
      if (permanent) {
        const ownerStatus = attendanceMap.get(permanent.ownerId)
        permanentOwner = permanent.ownerName
        permanentOwnerId = permanent.ownerId
        if (ownerStatus === 'In-Office') {
          status = 'occupied'
        } else if (reservation) {
          status = 'reserved'
          reservedBy = reservation.employeeName
          reservedById = reservation.employeeId
        } else {
          status = 'available'
        }
      } else if (reservation) {
        status = 'reserved'
        reservedBy = reservation.employeeName
        reservedById = reservation.employeeId
      } else {
        status = 'available'
      }
    } else if (permanent) {
      permanentOwner = permanent.ownerName
      permanentOwnerId = permanent.ownerId
      const ownerStatus = attendanceMap.get(permanent.ownerId)

      if (ownerStatus === 'In-Office') {
        status = 'occupied'
      } else {
        // Owner is Remote/Sick/Vacation — spot is available or reserved by someone else
        if (reservation) {
          status = 'reserved'
          reservedBy = reservation.employeeName
          reservedById = reservation.employeeId
        } else {
          status = 'available'
        }
      }
    } else if (reservation) {
      status = 'reserved'
      reservedBy = reservation.employeeName
      reservedById = reservation.employeeId
    }

    return {
      id: spot.id,
      floor,
      label: spot.label,
      row: spot.row,
      col: spot.col,
      type: spot.type as ParkingSpot['type'],
      status,
      permanentOwner,
      permanentOwnerId,
      reservedBy,
      reservedById,
      orientation: spot.orientation as ParkingSpot['orientation'],
    }
  })
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  currentFloor: 'B1',
  preferredFloor: 'B1',
  currentUserId: CURRENT_USER_ID,
  currentUserName: CURRENT_USER_NAME,
  reservations: [],
  spots: computeSpots('B1', []),

  setPreferredFloor: (floor) => {
    const { reservations } = get()
    set({
      preferredFloor: floor,
      currentFloor: floor,
      spots: computeSpots(floor, reservations),
    })
  },

  setFloor: (floor) => {
    const { reservations } = get()
    set({
      currentFloor: floor,
      spots: computeSpots(floor, reservations),
    })
  },

  reserveSpot: (spotId) => {
    const { reservations, currentFloor, currentUserId, currentUserName } = get()
    const existing = reservations.find((r) => r.employeeId === currentUserId)
    const withoutExisting = reservations.filter(
      (r) => r.employeeId !== currentUserId,
    )
    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      spotId,
      employeeId: currentUserId,
      employeeName: currentUserName,
      date: new Date().toISOString().split('T')[0],
      floor: currentFloor,
    }
    const updated = [...withoutExisting, newReservation]
    set({
      reservations: updated,
      spots: computeSpots(currentFloor, updated),
    })
    const feed = useActivityFeedStore.getState()
    if (existing) {
      feed.addEvent({
        id: `feed-cancel-${Date.now()}`,
        type: 'cancelled',
        message: `${currentUserName} cancelled reservation for spot ${existing.spotId}`,
        timestamp: Date.now(),
      })
    }
    feed.addEvent({
      id: `feed-reserve-${Date.now()}`,
      type: 'reserved',
      message: `${currentUserName} reserved spot ${spotId} on floor ${currentFloor}`,
      timestamp: Date.now(),
    })
  },

  reserveSpotOnFloor: (spotId, floor) => {
    const { reservations, currentFloor, currentUserId, currentUserName } = get()
    const existing = reservations.find((r) => r.employeeId === currentUserId)
    const withoutExisting = reservations.filter(
      (r) => r.employeeId !== currentUserId,
    )
    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      spotId,
      employeeId: currentUserId,
      employeeName: currentUserName,
      date: new Date().toISOString().split('T')[0],
      floor,
    }
    const updated = [...withoutExisting, newReservation]
    set({
      reservations: updated,
      spots: computeSpots(currentFloor, updated),
    })
    const feed = useActivityFeedStore.getState()
    if (existing) {
      feed.addEvent({
        id: `feed-cancel-${Date.now()}`,
        type: 'cancelled',
        message: `${currentUserName} cancelled reservation for spot ${existing.spotId}`,
        timestamp: Date.now(),
      })
    }
    feed.addEvent({
      id: `feed-reserve-${Date.now()}`,
      type: 'reserved',
      message: `${currentUserName} reserved spot ${spotId} on floor ${floor}`,
      timestamp: Date.now(),
    })
  },

  cancelReservation: (spotId) => {
    const { reservations, currentFloor, currentUserName } = get()
    const updated = reservations.filter((r) => r.spotId !== spotId)
    set({
      reservations: updated,
      spots: computeSpots(currentFloor, updated),
    })
    useActivityFeedStore.getState().addEvent({
      id: `feed-cancel-${Date.now()}`,
      type: 'cancelled',
      message: `${currentUserName} cancelled reservation for spot ${spotId}`,
      timestamp: Date.now(),
    })
  },

  getAllSpots: () => {
    const { reservations } = get()
    const floors: FloorId[] = ['B1', 'B2', 'B3']
    return floors.flatMap((floor) => computeSpots(floor, reservations))
  },

  getFloorStats: (floor) => {
    const { reservations } = get()
    const spots = computeSpots(floor, reservations)
    const total = spots.length
    const filled = spots.filter((s) => s.status === 'occupied').length
    const reserved = spots.filter((s) => s.status === 'reserved').length
    const available = spots.filter((s) => s.status === 'available').length
    return { total, filled, available, reserved }
  },
}))
