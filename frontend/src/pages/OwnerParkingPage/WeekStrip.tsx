import { ChevronLeft, ChevronRight, Star, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { WeekStripProps } from './types'
import { getWeekLabel } from './utils'

export function WeekStrip({
  days,
  today,
  selectedDate,
  onSelect,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  workFreeDays,
}: WeekStripProps) {
  const { i18n, t } = useTranslation()
  const weekLabel = getWeekLabel(days, i18n.language)
  const isCurrentWeek = days.includes(today)
  // The previous week ends the day before days[0], so it's fully past whenever
  // days[0] is today or earlier — nothing selectable there.
  const prevDisabled = (days[0] ?? '') <= today
  // today is in a past week → need to go left; future week → go right
  const todayIsLeft = !isCurrentWeek && today < (days[0] ?? '')
  const todayIsRight = !isCurrentWeek && today > (days[days.length - 1] ?? '')

  const todayBtn = (
    <button
      onClick={onGoToToday}
      className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors"
    >
      {t('map.today')}
    </button>
  )

  return (
    <div className="bg-card overflow-x-auto rounded-2xl border p-1.5">
      {/* Week navigation header — 3-column grid keeps the label centered */}
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center px-1">
        {/* Left: prev arrow + today button when today is in a past week */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevWeek}
            disabled={prevDisabled}
            title={t('map.prevWeek')}
            className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
              prevDisabled
                ? 'text-muted-foreground/30 cursor-not-allowed'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ChevronLeft className="size-4" />
          </button>
          {todayIsLeft && todayBtn}
        </div>

        {/* Center: week label */}
        <span className="text-center text-sm font-medium">{weekLabel}</span>

        {/* Right: today button when today is in a future week + next arrow */}
        <div className="flex items-center justify-end gap-3">
          {todayIsRight && todayBtn}
          <button
            onClick={onNextWeek}
            title={t('map.nextWeek')}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-lg transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((date) => {
          const d = new Date(date + 'T00:00:00')
          const isSelected = date === selectedDate
          const isToday = date === today
          const isWeekend = [0, 6].includes(d.getDay())
          const isHoliday = !isWeekend && workFreeDays.includes(date)
          const isPast = date < today
          const isNonWork = isWeekend || isHoliday || isPast
          const weekday = d.toLocaleDateString(i18n.language, {
            weekday: 'short',
          })
          const dayNum = d.getDate()

          return (
            <button
              key={date}
              onClick={() => !isNonWork && onSelect(date)}
              disabled={isNonWork}
              aria-label={`${weekday} ${dayNum}`}
              title={isPast ? t('map.pastDay') : undefined}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground cursor-pointer shadow-sm'
                  : isNonWork
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'hover:bg-muted cursor-pointer'
              }`}
            >
              <span
                className={`text-[11px] leading-none capitalize ${
                  isSelected
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}
              >
                {weekday}
              </span>
              <span
                className={`text-lg leading-tight font-bold ${isPast && !isSelected ? 'line-through decoration-1' : ''}`}
              >
                {dayNum}
              </span>
              {isToday && !isNonWork && (
                <div
                  className={`mt-0.5 size-1 rounded-full ${
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  }`}
                />
              )}
              {isWeekend && (
                <Sun
                  className={`size-2.5 ${isSelected ? 'opacity-70' : 'opacity-50'}`}
                />
              )}
              {isHoliday && (
                <Star
                  className={`size-2.5 ${isSelected ? 'opacity-70' : 'opacity-50'}`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
