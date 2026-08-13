import { useMemo } from 'react'

import { usePresence } from '@/hooks/usePresence'
import { useSpotDayOverrides, useSpots } from '@/hooks/useSpots'
import { useAuthStore } from '@/store/authStore'
import type { Spot, SpotStatus } from '@/types'

// An owned spot whose effective status would otherwise resolve to 'free' must
// upgrade to 'spotted' when the API returned an active, non-expired user report
// for it. The backend SQL only layers 'spotted' onto s.status='free' rows, so
// owned spots (raw DB status 'occupied') need this layered in the client.
function hasActiveSpottedReport(spot: Spot): boolean {
  if (!spot.spotted_reported_at || !spot.spotted_expires_at) return false
  return new Date(spot.spotted_expires_at).getTime() > Date.now()
}

// A booking for another day must not leak into this day's view.
function stripForeignBooking(spot: Spot, date: string): Spot {
  if (spot.active_booking_date === date || spot.active_booking_id == null) {
    return spot
  }
  return {
    ...spot,
    active_booking_id: null,
    active_booking_user_id: null,
    active_booking_reserved_by: null,
    active_booking_starts_at: null,
    active_booking_expires_at: null,
    active_booking_date: null,
    active_booking_booked_by_owner: null,
  }
}

/**
 * Returns all spots with effective status for a given date.
 * Priority (matches backend booking logic):
 *   1. Active booking on this date → reserved
 *   2. Manual override (spot_day_status) → free / occupied
 *   3. Presence/timesheet → in_office = occupied, away = free
 *   4. Fallback → spots.status
 */
export function useEffectiveSpots(date: string) {
  const spotsQuery = useSpots()
  const presenceQuery = usePresence(date)
  const overridesQuery = useSpotDayOverrides(date)
  const isGuest = useAuthStore((s) => s.user?.role === 'guest')

  const isWorkFreeDay = useMemo(() => {
    return presenceQuery.data?.work_free_days.includes(date) ?? false
  }, [presenceQuery.data, date])

  const data = useMemo<Spot[]>(() => {
    const spots = spotsQuery.data ?? []
    const employees = presenceQuery.data?.employees ?? []
    const workFreeDays = presenceQuery.data?.work_free_days ?? []
    const today = new Date().toISOString().slice(0, 10)
    const isToday = date === today

    // Override lookup: spot_id → 'free' | 'occupied'
    const overrides = overridesQuery.data ?? []
    const overrideBySpot = new Map<string, 'free' | 'occupied'>()
    for (const o of overrides) {
      overrideBySpot.set(o.spot_id, o.status)
    }

    // Presence lookup: lowercase name → 'in_office' | 'absent'
    // Only parking_available determines the spot state — work status is ignored.
    // parking_available=true → owner freed their spot → 'absent' (bookable)
    // parking_available=false → owner occupying their spot → 'in_office' (taken)
    const presenceByName = new Map<string, 'in_office' | 'absent'>()

    // If it's a work-free day (holiday), everyone's spot is free
    if (workFreeDays.includes(date)) {
      for (const p of employees) {
        presenceByName.set(p.name.toLowerCase(), 'absent')
      }
    } else {
      for (const p of employees) {
        const dayEntry = p.week.find((d) => d.date === date)
        if (dayEntry) {
          presenceByName.set(
            p.name.toLowerCase(),
            dayEntry.parking_available ? 'absent' : 'in_office',
          )
        }
      }
    }

    const processed = spots.map((raw) => {
      const bookingIsForDate = raw.active_booking_date === date
      const hasNoBooking = raw.active_booking_id == null
      const spot = stripForeignBooking(raw, date)

      // An active booking for this specific date → always show as reserved,
      // regardless of the spot's base status. This matters for ACEX-owned spots
      // whose status is masked as 'free' by the API even when reserved.
      if (bookingIsForDate) return { ...spot, status: 'reserved' as const }

      // Manually reserved today with no booking → preserve reserved.
      if (spot.status === 'reserved' && isToday && hasNoBooking) return spot

      // 2. Manual override → authoritative.
      // Treat 'occupied' overrides as 'reserved' so owner self-occupation
      // registers as a reservation in Stats/Dashboard counts.
      // Exception: a 'free' override still yields 'spotted' if there's an
      // active user report — owner waiving the spot doesn't disprove a
      // user's "car here" report.
      const override = overrideBySpot.get(spot.id)
      if (override) {
        const status: SpotStatus =
          override === 'occupied'
            ? 'reserved'
            : hasActiveSpottedReport(spot)
              ? 'spotted'
              : override
        return { ...spot, status }
      }

      // Exactly one owner per spot — the timesheet names a single person.
      const ownerName = (spot.owner_name ?? '').trim()
      const presence = ownerName
        ? presenceByName.get(ownerName.toLowerCase())
        : undefined

      // No presence data for the owner → reset non-today reservations to free.
      if (presence === undefined) {
        return spot.status === 'reserved'
          ? { ...spot, status: 'free' as const }
          : spot
      }

      const isInOffice = presence === 'in_office'

      // Layer 'spotted' on top of a presence-derived 'free' when there's an
      // active user report — i.e. nothing else is claiming the spot, so the
      // user's report remains the only signal. This must run for owned spots
      // too: the API leaves their raw status as 'occupied' regardless of
      // presence, so we can't rely on spot.status === 'spotted' alone.
      let effectiveStatus: SpotStatus = 'free'
      if (isInOffice) effectiveStatus = 'occupied'
      else if (hasActiveSpottedReport(spot)) effectiveStatus = 'spotted'

      // Guests get a positional flag instead of the name — the owner's
      // attendance isn't theirs to read by name (the status already says
      // whether the spot is taken).
      return {
        ...spot,
        status: effectiveStatus,
        in_office_owner: !isGuest && isInOffice ? ownerName : null,
        away_owners: isGuest || isInOffice ? null : [ownerName],
        in_office_owner_index: isGuest && isInOffice ? 0 : null,
        away_owner_indices: isGuest && !isInOffice ? [0] : null,
      }
    })

    // Deduplicate: a spot with bookings on multiple days produces multiple rows.
    const byId = new Map<string, Spot>()
    for (const spot of processed) {
      const existing = byId.get(spot.id)
      if (!existing) {
        byId.set(spot.id, spot)
        continue
      }
      const existingForDate = existing.active_booking_date === date
      const newForDate = spot.active_booking_date === date
      if (newForDate && !existingForDate) {
        byId.set(spot.id, spot)
      } else if (
        !newForDate &&
        !existingForDate &&
        spot.status === 'reserved' &&
        existing.status !== 'reserved'
      ) {
        byId.set(spot.id, spot)
      }
    }
    return Array.from(byId.values())
  }, [spotsQuery.data, presenceQuery.data, overridesQuery.data, date, isGuest])

  return {
    ...spotsQuery,
    data,
    isWorkFreeDay,
    isLoadingPresence: presenceQuery.isLoading,
  }
}
