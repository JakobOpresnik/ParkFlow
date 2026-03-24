import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SaveIndicatorProps } from './types'

// — sub-components —

export function SaveIndicator({ status }: SaveIndicatorProps) {
  const { t } = useTranslation()
  if (status === 'idle') return null
  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${status === 'saving' ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}
    >
      {status === 'saving'
        ? t('mapEditor.savingStatus')
        : t('mapEditor.savedStatus')}
      {status === 'saving' && <Loader2 className="size-3 animate-spin" />}
    </span>
  )
}
