import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'

import { useCreateSpot, usePatchCoordinates } from '@/hooks/useSpots'
import type { SpotCoordinates } from '@/types'

// — types —

interface MutationCallbacks {
  readonly onSaved: (spotId: string) => void
  readonly onRemoved: () => void
}

interface UseEditorMutationsReturn {
  readonly isPending: boolean
  readonly handleSaveToSpot: (
    spotId: string,
    relCoords: SpotCoordinates,
  ) => Promise<void>
  readonly handleCreateSpot: (
    number: number,
    label: string,
    relCoords: SpotCoordinates,
    lotId: string,
  ) => Promise<void>
  readonly handleRemoveCoords: (spotId: string) => Promise<void>
  readonly patchCoords: ReturnType<typeof usePatchCoordinates>
}

// — hook —

export function useEditorMutations(
  callbacks: MutationCallbacks,
): UseEditorMutationsReturn {
  const { t } = useTranslation()
  const patchCoords = usePatchCoordinates()
  const createSpot = useCreateSpot()
  const isPending = patchCoords.isPending || createSpot.isPending

  async function handleSaveToSpot(
    spotId: string,
    relCoords: SpotCoordinates,
  ) {
    try {
      await patchCoords.mutateAsync({ id: spotId, coordinates: relCoords })
      notifications.show({
        message: t('mapEditor.coordinatesSaved'),
        color: 'green',
      })
      callbacks.onSaved(spotId)
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error ? err.message : t('mapEditor.failedToSave'),
        color: 'red',
      })
    }
  }

  async function handleCreateSpot(
    number: number,
    label: string,
    relCoords: SpotCoordinates,
    lotId: string,
  ) {
    try {
      const spot = await createSpot.mutateAsync({
        number,
        label: label || null,
        lot_id: lotId,
      })
      await patchCoords.mutateAsync({ id: spot.id, coordinates: relCoords })
      notifications.show({
        message: t('mapEditor.spotCreated', { number }),
        color: 'green',
      })
      callbacks.onSaved(spot.id)
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error
            ? err.message
            : t('mapEditor.failedToCreateSpot'),
        color: 'red',
      })
    }
  }

  async function handleRemoveCoords(spotId: string) {
    try {
      await patchCoords.mutateAsync({ id: spotId, coordinates: null })
      notifications.show({
        message: t('mapEditor.coordinatesRemoved'),
        color: 'green',
      })
      callbacks.onRemoved()
    } catch (err) {
      notifications.show({
        message:
          err instanceof Error ? err.message : t('mapEditor.failedToRemove'),
        color: 'red',
      })
    }
  }

  return {
    isPending,
    handleSaveToSpot,
    handleCreateSpot,
    handleRemoveCoords,
    patchCoords,
  }
}
