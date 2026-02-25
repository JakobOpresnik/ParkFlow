import { useMemo } from 'react'
import { useParkingStore } from '@/store/parkingStore'
import type { ReasonTag, SuggestedSpot } from '@/types'
import reliabilityData from '@/data/spot_reliability.json'

const reliability = reliabilityData as Record<string, number>

export function useSmartSuggestions(): SuggestedSpot[] {
  const getAllSpots = useParkingStore((s) => s.getAllSpots)
  const preferredFloor = useParkingStore((s) => s.preferredFloor)
  const spots = useParkingStore((s) => s.spots)

  return useMemo(() => {
    const allSpots = getAllSpots()

    const available = allSpots.filter(
      (s) => s.status === 'available' && s.type !== 'handicap',
    )

    const scored: SuggestedSpot[] = available.map((spot) => {
      let score = 0
      const reasons: ReasonTag[] = []

      // Preferred floor match (40 pts)
      if (spot.floor === preferredFloor) {
        score += 40
        reasons.push({ label: 'Your floor', color: 'violet', icon: 'floor' })
      }

      // Proximity to elevator/entry — row 0 is closest to entry (30 pts)
      const proximityScore = Math.max(0, 30 - spot.row * 10)
      score += proximityScore
      if (spot.row <= 1) {
        reasons.push({
          label: 'Near elevator',
          color: 'blue',
          icon: 'elevator',
        })
      }

      // Historical reliability (20 pts)
      const rel = reliability[spot.id] ?? 50
      score += (rel / 100) * 20
      if (rel >= 75) {
        reasons.push({
          label: 'Usually available',
          color: 'green',
          icon: 'reliable',
        })
      }

      // Type bonus (10 pts)
      if (spot.type === 'ev') {
        score += 10
        reasons.push({ label: 'EV charging', color: 'yellow', icon: 'ev' })
      } else if (spot.type === 'compact') {
        score += 5
        reasons.push({ label: 'Compact', color: 'gray', icon: 'compact' })
      }

      return {
        spot,
        score,
        reasons: reasons.slice(0, 2),
      }
    })

    return scored.sort((a, b) => b.score - a.score).slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spots triggers recomputation when reservations change
  }, [getAllSpots, preferredFloor, spots])
}
