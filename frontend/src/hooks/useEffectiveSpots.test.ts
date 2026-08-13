import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmployeePresence, Spot } from '@/types'

import { useEffectiveSpots } from './useEffectiveSpots'

vi.mock('@/hooks/useSpots', () => ({
  useSpots: vi.fn(),
  useSpotDayOverrides: vi.fn(),
}))
vi.mock('@/hooks/usePresence', () => ({ usePresence: vi.fn() }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: { user: { role: string } }) => unknown) =>
    sel({ user: { role: 'user' } }),
}))

import { usePresence } from '@/hooks/usePresence'
import { useSpotDayOverrides, useSpots } from '@/hooks/useSpots'

const WED = '2026-08-12'
const THU = '2026-08-13'

// 1VP52: owned by Mitja (in office Wed, away Thu), booked by Nevena for Thu only.
const spot1VP52 = {
  id: 's-1vp52',
  number: 52,
  label: '1VP52',
  floor: 'Klet -1',
  lot_id: 'lot-1',
  status: 'occupied',
  type: 'standard',
  owner_id: 'o-mitja',
  coordinates: null,
  created_at: '2026-01-01T00:00:00Z',
  owner_name: 'Mitja Gornik',
  owner_email: null,
  owner_phone: null,
  owner_vehicle_plate: null,
  owner_user_id: 'mitja',
  active_booking_id: 'b-1',
  active_booking_user_id: 'u-nevena',
  active_booking_reserved_by: 'Nevena Pivač',
  active_booking_starts_at: `${THU}T07:00:00Z`,
  active_booking_expires_at: `${THU}T15:00:00Z`,
  active_booking_date: THU,
  active_booking_booked_by_owner: false,
  spotted_reported_at: null,
  spotted_expires_at: null,
  status_set_by: null,
} as Spot

const mitjaPresence: EmployeePresence = {
  user_id: 1,
  name: 'Mitja Gornik',
  week: [
    { date: WED, is_work_free_day: false, parking_available: false },
    { date: THU, is_work_free_day: false, parking_available: true },
  ],
}

beforeEach(() => {
  vi.mocked(useSpots).mockReturnValue({
    data: [spot1VP52],
  } as ReturnType<typeof useSpots>)
  vi.mocked(usePresence).mockReturnValue({
    data: { employees: [mitjaPresence], work_free_days: [] },
  } as unknown as ReturnType<typeof usePresence>)
  vi.mocked(useSpotDayOverrides).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useSpotDayOverrides>)
})

describe('useEffectiveSpots — booking on another day must not leak', () => {
  it('Wednesday: owner in office, Thursday booking stripped', () => {
    const { result } = renderHook(() => useEffectiveSpots(WED))
    const spot = result.current.data[0] as Spot
    expect(spot.status).toBe('occupied')
    expect(spot.in_office_owner).toBe('Mitja Gornik')
    expect(spot.active_booking_reserved_by).toBeNull()
    expect(spot.active_booking_id).toBeNull()
  })

  it('Thursday: booking for that day shows as reserved by Nevena', () => {
    const { result } = renderHook(() => useEffectiveSpots(THU))
    const spot = result.current.data[0] as Spot
    expect(spot.status).toBe('reserved')
    expect(spot.active_booking_reserved_by).toBe('Nevena Pivač')
    expect(spot.active_booking_date).toBe(THU)
  })
})
