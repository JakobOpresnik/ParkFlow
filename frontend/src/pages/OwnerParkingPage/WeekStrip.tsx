import { Star, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { WeekStripProps } from './types'

export function WeekStrip({
  days,
  today,
  selectedDate,
  onSelect,
  workFreeDays,
}: WeekStripProps) {
  const { i18n } = useTranslation()
  return (
    <div className="bg-card rounded-2xl border p-1.5">
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const d = new Date(date + 'T00:00:00')
          const isSelected = date === selectedDate
          const isToday = date === today
          const isWeekend = [0, 6].includes(d.getDay())
          const isHoliday = !isWeekend && workFreeDays.includes(date)
          const isNonWork = isWeekend || isHoliday
          const weekday = d.toLocaleDateString(i18n.language, {
            weekday: 'short',
          })
          const dayNum = d.getDate()

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              aria-label={`${weekday} ${dayNum}`}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isNonWork
                    ? 'text-muted-foreground/60 hover:bg-muted'
                    : 'hover:bg-muted'
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
              <span className="text-lg leading-tight font-bold">{dayNum}</span>
              {isToday && !isNonWork && (
                <div
                  className={`size-1 rounded-full ${
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
