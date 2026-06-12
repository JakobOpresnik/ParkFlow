// /api/spots and /api/owners/me/spots LEFT JOIN the active booking, so a spot
// booked on more than one day comes back as multiple rows with the same id but
// different active_booking_* fields. Consumers that don't run the date-aware
// dedup in useEffectiveSpots must collapse to one row per id first — otherwise
// they render duplicate cards/rows (duplicate React keys, inflated counts) and,
// worse, can act on the wrong day's booking.
//
// When `preferDate` is given, the row whose booking falls on that day wins, so
// the surviving row carries the booking the user is actually looking at.
export function dedupeSpotsById<
  T extends { id: string; active_booking_date?: string | null },
>(rows: readonly T[], preferDate?: string): T[] {
  const byId = new Map<string, T>()
  for (const row of rows) {
    const existing = byId.get(row.id)
    if (!existing) {
      byId.set(row.id, row)
      continue
    }
    if (
      preferDate !== undefined &&
      row.active_booking_date === preferDate &&
      existing.active_booking_date !== preferDate
    ) {
      byId.set(row.id, row)
    }
  }
  return [...byId.values()]
}
