import type { Spot, SpotStatus } from '@/types'

export function computePct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

export function countByStatus(
  spots: readonly Spot[],
  status: SpotStatus,
): number {
  return spots.filter((s) => s.status === status).length
}

export interface FloorStats {
  readonly lotId: string
  readonly name: string
  readonly total: number
  readonly free: number
  readonly occupied: number
  readonly occupancyPct: number
}

export function computeFloorStats(
  lotId: string,
  name: string,
  spots: readonly Spot[],
): FloorStats {
  const total = spots.length
  const free = countByStatus(spots, 'free')
  const occupied =
    countByStatus(spots, 'occupied') +
    countByStatus(spots, 'reserved') +
    countByStatus(spots, 'unconfirmed')
  return {
    lotId,
    name,
    total,
    free,
    occupied,
    occupancyPct: computePct(occupied, total),
  }
}
