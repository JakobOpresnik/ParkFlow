import type { ActivityEvent, ActivityEventType } from '@/types'
import permanentSpots from './permanent_spots.json'
import attendance from './attendance.json'

function makeSeedEvents(): ActivityEvent[] {
  const events: ActivityEvent[] = []
  const now = new Date()
  const baseHour = 7

  const attendanceMap = new Map(attendance.map((a) => [a.employeeId, a.status]))

  // Generate events from permanent spot owners
  for (const spot of permanentSpots) {
    const status = attendanceMap.get(spot.ownerId)
    if (!status) continue

    const minuteOffset = Math.floor(Math.random() * 150) // 0-150 min from 7:00
    const timestamp = new Date(now)
    timestamp.setHours(baseHour, minuteOffset, 0, 0)

    if (status === 'In-Office') {
      events.push({
        id: `seed-park-${spot.spotId}`,
        type: 'parked',
        message: `${spot.ownerName} parked in ${spot.spotId}`,
        timestamp: timestamp.getTime(),
      })
    } else if (status === 'Remote') {
      events.push({
        id: `seed-avail-${spot.spotId}`,
        type: 'available',
        message: `Spot ${spot.spotId} is now available — ${spot.ownerName} is remote today`,
        timestamp: timestamp.getTime(),
      })
    } else if (status === 'Sick') {
      events.push({
        id: `seed-sick-${spot.spotId}`,
        type: 'available',
        message: `Spot ${spot.spotId} freed up — ${spot.ownerName} is out sick`,
        timestamp: timestamp.getTime(),
      })
    } else if (status === 'Vacation') {
      events.push({
        id: `seed-vac-${spot.spotId}`,
        type: 'available',
        message: `Spot ${spot.spotId} is open — ${spot.ownerName} is on vacation`,
        timestamp: timestamp.getTime(),
      })
    }
  }

  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 12)
}

const newEventTemplates: { type: ActivityEventType; message: string }[] = [
  { type: 'reserved', message: 'Nathan Brooks reserved spot B2-B4' },
  { type: 'parked', message: 'Hannah Davis just parked in B3-C2' },
  { type: 'cancelled', message: 'Guest reservation for B1-D5 was cancelled' },
  { type: 'alert', message: 'Floor B2 is now at 90% capacity' },
  { type: 'available', message: 'Spot B1-C4 is now available again' },
  { type: 'reserved', message: 'Alex Morgan reserved spot B1-A4' },
  { type: 'parked', message: 'Visitor parked in guest spot B3-D1' },
  { type: 'alert', message: 'EV charging complete at B1-B1' },
  { type: 'available', message: 'Spot B2-C3 has been freed up' },
  { type: 'reserved', message: 'Meeting guest assigned B3-A6' },
]

export const seedEvents = makeSeedEvents()
export { newEventTemplates }
