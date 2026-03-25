import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

// — types —

interface IntervalEditorProps {
  readonly editStart: string
  readonly editEnd: string
  readonly onChangeStart: (v: string) => void
  readonly onChangeEnd: (v: string) => void
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly isPending: boolean
}

// — helpers —

function formatIntervalDuration(start: string, end: string): string | null {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh ?? 0) * 60 + (em ?? 0) - (sh ?? 0) * 60 - (sm ?? 0)
  if (mins <= 0) return null
  const dh = Math.floor(mins / 60)
  const dm = mins % 60
  return `${dh > 0 ? `${dh}h` : ''}${dm > 0 ? ` ${dm}m` : ''}`.trim()
}

// — main component —

export function IntervalEditor({
  editStart,
  editEnd,
  onChangeStart,
  onChangeEnd,
  onSave,
  onCancel,
  isPending,
}: IntervalEditorProps) {
  const { t } = useTranslation()
  const durationLabel = formatIntervalDuration(editStart, editEnd)
  return (
    <div className="bg-muted/50 space-y-3 rounded-lg px-4 py-3">
      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
        {t('spotModal.adjustInterval')}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">
            {t('spotModal.intervalFrom')}
          </label>
          <input
            type="time"
            value={editStart}
            onChange={(e) => onChangeStart(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          />
        </div>
        <span className="text-muted-foreground mt-5">–</span>
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">
            {t('spotModal.intervalTo')}
          </label>
          <input
            type="time"
            value={editEnd}
            onChange={(e) => onChangeEnd(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          />
        </div>
      </div>
      {durationLabel && (
        <p className="text-muted-foreground text-right text-xs">
          {t('spotModal.intervalDuration', { duration: durationLabel })}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={isPending}
          onClick={onSave}
        >
          {t('spotModal.intervalSave')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('spotModal.intervalCancel')}
        </Button>
      </div>
    </div>
  )
}
