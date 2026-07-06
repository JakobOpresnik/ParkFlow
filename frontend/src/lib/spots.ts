import type { Spot, SpotStatus } from '@/types'

// Mirrors backend/src/lib/acexOwners.ts's ACEX_OWNER_NAME — the "first come,
// first served" public pool, not a real owner. No shared package between
// frontend/backend, so this is kept in sync by hand.
export const ACEX_OWNER_NAME = 'ACEX - kdor prej pride, prej melje'

// Owner-name placeholders that aren't an actual person who could be
// occupying a spot. Deliberately a subset of backend's NOT_ACEX_OWNERS —
// that set also covers vehicles/external renters (Tesla S/X, ARHEA, Reduxi,
// "oddano v najem: MIK"), which ARE real, known assignments, not unknowns.
const NON_OCCUPANT_OWNER_NAMES = new Set<string>([
  ACEX_OWNER_NAME,
  'kontejner - prenova',
])

export function hasRealOwner(ownerName: string | null | undefined): boolean {
  return !!ownerName && !NON_OCCUPANT_OWNER_NAMES.has(ownerName)
}

// 'reserved' must always name the reserver — the booker, or the admin who
// forced the status (status_set_by). No name at all means we can't tell who
// holds it — such spots display as grey "unavailable" instead of reserved,
// in the admin list and its status filter alike.
export function isDisplayedUnavailable(spot: Spot): boolean {
  return (
    spot.status === 'reserved' &&
    !spot.active_booking_reserved_by &&
    !spot.status_set_by
  )
}

export function countByStatus(
  spots: readonly Spot[],
  status: SpotStatus,
): number {
  return spots.filter((s) => s.status === status).length
}
