import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { Spot, SpotChange } from '@/types'

interface RecentlyFreedProps {
  readonly changes: readonly SpotChange[]
  readonly spots: readonly Spot[]
}

interface FreedSpot {
  readonly spotId: string
  readonly label: string
  readonly lotName: string | null
  readonly freedAt: string
}

const MAX_ITEMS = 5
const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000 // 2 hours

function isFreeValue(v: string | null): boolean {
  if (!v) return false
  const lower = v.toLowerCase()
  return lower === 'free'
}

function pickRecentlyFreed(
  changes: readonly SpotChange[],
  spots: readonly Spot[],
): FreedSpot[] {
  const spotById = new Map(spots.map((s) => [s.id, s]))
  const now = Date.now()
  const out: FreedSpot[] = []
  const seen = new Set<string>()

  for (const c of changes) {
    if (c.change_type !== 'status_changed') continue
    if (!isFreeValue(c.new_value) || isFreeValue(c.old_value)) continue
    const changedAt = new Date(c.changed_at).getTime()
    if (Number.isNaN(changedAt)) continue
    if (now - changedAt > FRESH_WINDOW_MS) continue

    const current = spotById.get(c.spot_id)
    if (current?.status !== 'free') continue

    if (seen.has(c.spot_id)) continue
    seen.add(c.spot_id)

    out.push({
      spotId: c.spot_id,
      label: c.spot_label ?? `#${c.spot_number}`,
      lotName: c.lot_name,
      freedAt: c.changed_at,
    })

    if (out.length >= MAX_ITEMS) break
  }
  return out
}

type TFunc = (key: string, opts?: Record<string, unknown>) => string

function formatRelative(iso: string, t: TFunc): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.round(ms / 60_000))
  if (mins < 1) return t('dashboard.justNow')
  if (mins < 60) return t('dashboard.minutesAgo', { m: mins })
  const hours = Math.round(mins / 60)
  return t('dashboard.hoursAgo', { h: hours })
}

export function RecentlyFreed({ changes, spots }: RecentlyFreedProps) {
  const { t } = useTranslation()
  const items = useMemo(
    () => pickRecentlyFreed(changes, spots),
    [changes, spots],
  )

  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/20">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-green-600 dark:text-green-400" />
        <h2 className="text-sm font-semibold">
          {t('dashboard.recentlyFreed')}
        </h2>
        <span className="text-muted-foreground ml-auto text-[11px]">
          {t('dashboard.recentlyFreedSub')}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li
            key={s.spotId}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-green-500" />
              <span className="truncate font-medium">{s.label}</span>
              {s.lotName && (
                <span className="text-muted-foreground truncate text-[11px]">
                  · {s.lotName}
                </span>
              )}
            </div>
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {formatRelative(s.freedAt, t)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
