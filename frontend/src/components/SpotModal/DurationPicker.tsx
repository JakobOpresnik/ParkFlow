import { Clock, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// — types —

interface DurationPickerProps {
  readonly duration: number
  readonly onChange: (d: number) => void
  readonly arrivalTime: string
  readonly expiryStr: string
}

// — helpers —

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// — main component —

export function DurationPicker({
  duration,
  onChange,
  arrivalTime,
  expiryStr,
}: DurationPickerProps) {
  const { t } = useTranslation()
  return (
    <div className="bg-muted/50 space-y-2 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock className="size-3.5" />
          {t('spotModal.durationFrom', { time: arrivalTime })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(Math.max(0.5, duration - 0.5))}
            className="hover:bg-background flex size-6 items-center justify-center rounded border transition-colors"
            aria-label="Decrease duration"
          >
            <Minus className="size-3" />
          </button>
          <span className="w-14 text-center text-sm font-medium">
            {formatDuration(duration)}
          </span>
          <button
            onClick={() => onChange(Math.min(24, duration + 0.5))}
            className="hover:bg-background flex size-6 items-center justify-center rounded border transition-colors"
            aria-label="Increase duration"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>
      <p className="text-muted-foreground text-right text-xs">
        {t('spotModal.durationUntil', { time: expiryStr })}
      </p>
    </div>
  )
}
