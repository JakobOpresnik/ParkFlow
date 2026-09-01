import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// Lot/floor names are stored in Slovenian in the DB; localize known ones.
export function useLotName() {
  const { t } = useTranslation()
  return useCallback(
    (name: string) => t(`lotNames.${name}`, { defaultValue: name }),
    [t],
  )
}
