import { CalendarDays } from 'lucide-react'

import type { ParkingLot, Spot } from '@/types'

import { formatDayLabel, getTodayDotClass, StatusDotClass } from './utils'

// ─── types ────────────────────────────────────────────────────────────────────

interface LotStatusDotProps {
  readonly lot: ParkingLot
  readonly allSpots: Spot[]
  readonly activeLot: ParkingLot | null
}

interface LotDaySelectorProps {
  readonly lots: ParkingLot[]
  readonly allSpots: Spot[]
  readonly isLoading: boolean
  readonly activeLot: ParkingLot | null
  readonly selectedDate: string
  readonly weekDays: string[]
  readonly today: string
  readonly isMapMode: boolean
  readonly keyNavRow: number
  readonly onLotSelect: (lot: ParkingLot) => void
  readonly onDateSelect: (date: string) => void
}

// ─── sub-components ───────────────────────────────────────────────────────────

function LotStatusDot({ lot, allSpots, activeLot }: LotStatusDotProps) {
  const lotSpots = allSpots.filter((s) => s.lot_id === lot.id)
  const free = lotSpots.filter((s) => s.status === 'free').length
  if (lotSpots.length === 0) return null
  return (
    <span
      className={`ml-3 size-1.5 cursor-pointer rounded-full ${
        free === 0 ? StatusDotClass['occupied'] : StatusDotClass['free']
      } ${activeLot?.id === lot.id ? 'opacity-100' : 'opacity-70'}`}
      title={free === 0 ? 'No free spots' : `${free} free`}
    />
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function LotDaySelector({
  lots,
  allSpots,
  isLoading,
  activeLot,
  selectedDate,
  weekDays,
  today,
  isMapMode,
  keyNavRow,
  onLotSelect,
  onDateSelect,
}: LotDaySelectorProps) {
  return (
    <div className="absolute top-3 left-3 z-20 max-w-[calc(100vw-96px)]">
      <div
        className={`flex flex-col gap-1 rounded-xl p-1.5 ${
          isMapMode
            ? 'bg-black/40 backdrop-blur-sm'
            : 'bg-card border shadow-sm'
        }`}
      >
        {/* Row 1: lot tabs */}
        <div
          className={`flex flex-wrap gap-1 rounded-lg transition-shadow ${
            keyNavRow === 0
              ? isMapMode
                ? 'ring-1 ring-white/40'
                : 'ring-primary/50 ring-1'
              : ''
          }`}
        >
          {isLoading ? (
            <>
              <div
                className={`h-9 w-20 animate-pulse rounded-lg ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
              />
              <div
                className={`h-9 w-24 animate-pulse rounded-lg ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
              />
            </>
          ) : (
            lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => onLotSelect(lot)}
                className={`flex min-h-9 items-center rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  isMapMode
                    ? activeLot?.id === lot.id
                      ? 'bg-white text-blue-950'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    : activeLot?.id === lot.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {lot.name}
                <LotStatusDot
                  lot={lot}
                  allSpots={allSpots}
                  activeLot={activeLot}
                />
              </button>
            ))
          )}
        </div>

        {/* Divider */}
        <div
          className={`-mx-0.5 h-px ${isMapMode ? 'bg-white/15' : 'bg-border'}`}
        />

        {/* Row 2: Mon–Fri day strip */}
        <div
          className={`flex gap-0.5 rounded-lg transition-shadow ${
            keyNavRow === 1
              ? isMapMode
                ? 'ring-1 ring-white/40'
                : 'ring-primary/50 ring-1'
              : ''
          }`}
        >
          {weekDays.map((date) => {
            const { short, num } = formatDayLabel(date)
            const isToday = date === today
            const isSelected = date === selectedDate
            return (
              <button
                key={date}
                onClick={() => onDateSelect(date)}
                title={date}
                className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 transition-colors ${
                  isMapMode
                    ? isSelected
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    : isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-[10px] leading-none font-medium tracking-wide uppercase">
                  {short}
                </span>
                <span className="mt-0.5 text-sm leading-none font-bold tabular-nums">
                  {num}
                </span>
                <span
                  className={`mt-1 size-1 rounded-full transition-colors ${getTodayDotClass(isToday, isSelected, isMapMode)}`}
                />
              </button>
            )
          })}
        </div>

        {/* Row 3: projection note (non-today only) */}
        {selectedDate !== today && (
          <div
            className={`flex items-center gap-1.5 px-1 text-[10px] ${
              isMapMode ? 'text-white/50' : 'text-muted-foreground'
            }`}
          >
            <CalendarDays className="size-3 shrink-0" />
            {selectedDate < today
              ? 'Historical · based on recorded attendance'
              : 'Projected · based on scheduled attendance'}
          </div>
        )}
      </div>
    </div>
  )
}
