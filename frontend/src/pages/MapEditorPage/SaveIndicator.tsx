import type { SaveIndicatorProps } from './types'

// — sub-components —

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === 'idle') return null
  return (
    <span
      className={`text-xs ${status === 'saving' ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}
    >
      {status === 'saving' ? 'Saving…' : '✓ Saved'}
    </span>
  )
}
