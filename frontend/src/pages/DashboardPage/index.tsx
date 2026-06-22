import { Activity, CheckCircle2, ParkingCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { Sparkline } from '@/components/Sparkline'
import { useChanges } from '@/hooks/useChanges'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useLots } from '@/hooks/useLots'
import { useStatsHistory } from '@/hooks/useStatsHistory'

import { ActivityFeed } from './ActivityFeed'
import { HotSpots } from './HotSpots'
import { LotBreakdown } from './LotBreakdown'
import { RecentlyFreed } from './RecentlyFreed'
import { countByStatus, lastNDayCounts } from './utils'

// — types —

interface StatCardConfig {
  readonly label: string
  readonly Icon: ComponentType<{ className?: string }>
  readonly iconColor: string
  readonly iconBg: string
  readonly cardClass: string
}

interface StatCard extends StatCardConfig {
  readonly value: number
  readonly sub: string
}

// — constants —

const TODAY = new Date().toISOString().slice(0, 10)

const STAT_CARD_STYLES = [
  {
    labelKey: 'dashboard.occupied',
    Icon: ParkingCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    cardClass:
      'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
  },
  {
    labelKey: 'dashboard.totalSpots',
    Icon: Activity,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    cardClass:
      'border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20',
  },
] as const

// — main component —

export function DashboardPage() {
  const { t } = useTranslation()
  const { data: allSpots = [], isLoading: spotsLoading } =
    useEffectiveSpots(TODAY)
  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const { data: changes = [], isLoading: changesLoading } = useChanges()
  const { data: stats } = useStatsHistory(undefined, 7)

  const isLoading = spotsLoading || lotsLoading
  const sparkValues = lastNDayCounts(stats?.daily ?? [], 7)

  const totalFree = countByStatus(allSpots, 'free')
  const totalOccupied = countByStatus(allSpots, 'occupied')
  const totalReserved = countByStatus(allSpots, 'reserved')
  const totalUnconfirmed = countByStatus(allSpots, 'unconfirmed')
  const totalSpotted = countByStatus(allSpots, 'spotted')
  const totalInUse =
    totalOccupied + totalReserved + totalUnconfirmed + totalSpotted
  const total = allSpots.length
  const occupancyPct = total ? Math.round((totalInUse / total) * 100) : 0

  const supportingCards: readonly StatCard[] = [
    {
      ...STAT_CARD_STYLES[0],
      label: t(STAT_CARD_STYLES[0].labelKey),
      value: totalInUse,
      sub: t('dashboard.occupancyPct', { pct: occupancyPct }),
    },
    {
      ...STAT_CARD_STYLES[1],
      label: t(STAT_CARD_STYLES[1].labelKey),
      value: total,
      sub: t('dashboard.acrossAllLots'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="bg-muted h-24 animate-pulse rounded-xl border" />
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {([0, 1, 2] as const).map((k) => (
              <div
                key={k}
                className="bg-muted h-[72px] animate-pulse rounded-xl border sm:h-[88px]"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hero */}
          <div className="flex items-center gap-5 rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm dark:border-green-900/40 dark:bg-green-950/20">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-4xl leading-none font-bold tabular-nums sm:text-5xl">
                {totalFree}
              </p>
              <p className="mt-1.5 text-sm font-medium">
                {t('dashboard.spotsAvailable')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('dashboard.ofTotal', { total, pct: occupancyPct })}
              </p>
            </div>

            {sparkValues.some((v) => v > 0) && (
              <div className="text-muted-foreground ml-auto hidden flex-col items-end gap-1 sm:flex">
                <Sparkline values={sparkValues} />
                <span className="text-[11px]">
                  {t('dashboard.bookingsTrend')}
                </span>
              </div>
            )}
          </div>

          {/* Supporting */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {supportingCards.map(
              ({ label, value, sub, Icon, iconColor, iconBg, cardClass }) => (
                <div
                  key={label}
                  className={`flex flex-col gap-1.5 rounded-xl border p-3 shadow-sm sm:gap-2 sm:p-4 ${cardClass}`}
                >
                  <div
                    className={`flex size-7 items-center justify-center rounded-full sm:size-8 ${iconBg}`}
                  >
                    <Icon className={`size-3.5 sm:size-4 ${iconColor}`} />
                  </div>
                  <p className="text-xl font-bold tabular-nums sm:text-2xl">
                    {value}
                  </p>
                  <div>
                    <p className="text-xs font-medium sm:text-sm">{label}</p>
                    <p className="text-muted-foreground text-[11px] sm:text-xs">
                      {sub}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {!isLoading && <RecentlyFreed changes={changes} spots={allSpots} />}

      {!isLoading && <div className="border-t" />}

      {/* Two-column: lot breakdown + hot spots stacked on the left,
          activity feed on the right. items-start prevents the left column
          from stretching to match a tall activity feed. */}
      {!isLoading && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            {lots.length > 0 && (
              <LotBreakdown lots={lots} allSpots={allSpots} />
            )}
            <HotSpots
              changes={changes}
              spots={allSpots}
              isLoading={changesLoading}
            />
          </div>

          <ActivityFeed changes={changes} isLoading={changesLoading} />
        </div>
      )}
    </div>
  )
}
