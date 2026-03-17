import type { Spot, SpotStatus } from '@/types'

export function countByStatus(
  spots: readonly Spot[],
  status: SpotStatus,
): number {
  return spots.filter((s) => s.status === status).length
}
