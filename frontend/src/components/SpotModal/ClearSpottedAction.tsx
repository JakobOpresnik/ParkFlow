import { notifications } from '@mantine/notifications'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useClearSpotted } from '@/hooks/useSpots'

// — types —

interface ClearSpottedActionProps {
  readonly spotId: string
  readonly spotLabel: string
}

// — main component —

export function ClearSpottedAction({
  spotId,
  spotLabel,
}: ClearSpottedActionProps) {
  const { t } = useTranslation()
  const clearSpotted = useClearSpotted()

  async function handleClick() {
    try {
      await clearSpotted.mutateAsync(spotId)
      notifications.show({
        message: t('spotModal.toastSpottedCleared', { label: spotLabel }),
        color: 'green',
      })
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error
            ? err.message
            : t('spotModal.toastSpottedClearFailed'),
        color: 'red',
      })
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      color="orange.8"
      className="h-8 gap-1.5 px-2.5 text-xs font-medium"
      disabled={clearSpotted.isPending}
      onClick={handleClick}
    >
      <CheckCircle2 className="size-3.5" />
      {t('spotModal.clearSpotted')}
    </Button>
  )
}
