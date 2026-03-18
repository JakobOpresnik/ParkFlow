import { Activity, CheckCircle2, Clock, ParkingCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { useChanges } from '@/hooks/useChanges'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useLots } from '@/hooks/useLots'

import { ActivityFeed } from './ActivityFeed'
import { LotBreakdown } from './LotBreakdown'
import { countByStatus } from './utils'

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

// — main component —

const TODAY = new Date().toISOString().slice(0, 10)

export function DashboardPage() {
  const { t } = useTranslation()
  const { data: allSpots = [], isLoading: spotsLoading } =
    useEffectiveSpots(TODAY)
  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const { data: changes = [], isLoading: changesLoading } = useChanges()

  const isLoading = spotsLoading || lotsLoading

  const totalFree = countByStatus(allSpots, 'free')
  const totalOccupied = countByStatus(allSpots, 'occupied')
  const totalReservedByStatus = countByStatus(allSpots, 'reserved')
  // Also count occupied spots with an active booking (owner has booked their own spot —
  // backend marks these as 'occupied' rather than 'reserved').
  const totalReserved =
    totalReservedByStatus +
    allSpots.filter(
      (s) => s.status === 'occupied' && s.active_booking_id !== null,
    ).length
  const total = allSpots.length
  // Occupancy % uses raw status counts to avoid double-counting self-booked occupied spots.
  const occupancyPct = total
    ? Math.round(((totalOccupied + totalReservedByStatus) / total) * 100)
    : 0

  const STAT_CARD_CONFIG = [
    {
      label: t('dashboard.occupied'),
      Icon: ParkingCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      cardClass:
        'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
    },
    {
      label: t('dashboard.reserved'),
      Icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      cardClass:
        'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
    },
    {
      label: t('dashboard.totalSpots'),
      Icon: Activity,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      cardClass:
        'border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20',
    },
  ] satisfies ReadonlyArray<StatCardConfig>

  const supportingCards: readonly StatCard[] = [
    {
      ...STAT_CARD_CONFIG[0],
      value: totalOccupied,
      sub: t('dashboard.occupancyPct', { pct: occupancyPct }),
    } as StatCard,
    {
      ...STAT_CARD_CONFIG[1],
      value: totalReserved,
      sub: t('dashboard.bookedSpots'),
    } as StatCard,
    {
      ...STAT_CARD_CONFIG[2],
      value: total,
      sub: t('dashboard.acrossAllLots'),
    } as StatCard,
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
          <div className="grid grid-cols-3 gap-3">
            {([0, 1, 2] as const).map((k) => (
              <div
                key={k}
                className="bg-muted h-[88px] animate-pulse rounded-xl border"
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
              <p className="text-5xl leading-none font-bold tabular-nums">
                {totalFree}
              </p>
              <p className="mt-1.5 text-sm font-medium">
                {t('dashboard.spotsAvailable')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('dashboard.ofTotal', { total, pct: occupancyPct })}
              </p>
            </div>
          </div>

          {/* Supporting */}
          <div className="grid grid-cols-3 gap-3">
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

      {!isLoading && <div className="border-t" />}

      {/* Two-column: lot breakdown + activity feed */}
      {!isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {lots.length > 0 && <LotBreakdown lots={lots} allSpots={allSpots} />}

          <div className={lots.length === 0 ? 'lg:col-span-2' : ''}>
            <ActivityFeed changes={changes} isLoading={changesLoading} />
          </div>
        </div>
      )}
    </div>
  )
}
