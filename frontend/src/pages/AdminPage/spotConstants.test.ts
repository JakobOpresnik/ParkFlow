import { describe, expect, it } from 'vitest'

import { adminSpotStatus } from './spotConstants'

describe('adminSpotStatus', () => {
  it("shows 'reserved' when a spot has an active booking, even if its raw status is 'free' (ACEX spots are forced to 'free' by the API)", () => {
    expect(adminSpotStatus({ status: 'free', active_booking_id: 'b-1' })).toBe(
      'reserved',
    )
  })

  it('falls back to the raw status when there is no active booking', () => {
    expect(adminSpotStatus({ status: 'free', active_booking_id: null })).toBe(
      'free',
    )
    expect(
      adminSpotStatus({ status: 'occupied', active_booking_id: null }),
    ).toBe('occupied')
  })
})
