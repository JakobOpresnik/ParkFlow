import type { StatsDailyPoint } from '@/types'

// Per-day counts for the last `n` calendar days (oldest → newest), zero-filling
// missing days, for a sparkline. Mirrors how TrendChart fills its series.
export function lastNDayCounts(
  daily: readonly StatsDailyPoint[],
  n: number,
): number[] {
  const byDate = new Map(daily.map((d) => [d.date, d.count]))
  const out: number[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(byDate.get(d.toISOString().slice(0, 10)) ?? 0)
  }
  return out
}
