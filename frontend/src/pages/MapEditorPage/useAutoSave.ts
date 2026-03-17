import { notifications } from '@mantine/notifications'
import { useCallback, useRef, useState } from 'react'

import type { SpotCoordinates } from '@/types'

import type { SaveStatus } from './types'
import { AUTOSAVE_DEBOUNCE_MS, SAVE_FEEDBACK_DURATION_MS } from './utils'

// — hooks —

interface PatchCoordsApi {
  readonly mutate: (
    variables: { id: string; coordinates: SpotCoordinates | null },
    options?: {
      readonly onSuccess?: () => void
      readonly onError?: (err: unknown) => void
    },
  ) => void
}

export function useAutoSave(patchCoords: PatchCoordsApi) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoSave = useCallback(
    (id: string, relCoords: SpotCoordinates) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus('saving')
      saveTimerRef.current = setTimeout(() => {
        patchCoords.mutate(
          { id, coordinates: relCoords },
          {
            onSuccess: () => {
              setSaveStatus('saved')
              setTimeout(() => setSaveStatus('idle'), SAVE_FEEDBACK_DURATION_MS)
            },
            onError: (err) => {
              setSaveStatus('idle')
              notifications.show({
                message: err instanceof Error ? err.message : 'Save failed',
                color: 'red',
              })
            },
          },
        )
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [patchCoords],
  )

  return { saveStatus, scheduleAutoSave }
}
