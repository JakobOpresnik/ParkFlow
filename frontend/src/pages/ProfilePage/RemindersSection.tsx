import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PreferenceRow } from '@/components/PreferenceRow/PreferenceRow'
import { Switch } from '@/components/ui/switch'
import {
  useNotificationPrefs,
  useSetNotificationPref,
} from '@/hooks/useNotificationPrefs'

export function RemindersSection() {
  const { t } = useTranslation()
  const { data } = useNotificationPrefs()
  const setPref = useSetNotificationPref()

  if (!data) return null

  return (
    <>
      {data.catalog.map((c) => (
        <div key={c.type} className="py-4">
          <PreferenceRow
            icon={Bell}
            title={t(`profile.reminders.${c.type}.label`, c.label)}
            description={t(`profile.reminders.${c.type}.desc`, c.description)}
          >
            <Switch
              checked={data.prefs[c.type] !== false}
              onCheckedChange={(enabled) =>
                setPref.mutate({ type: c.type, enabled })
              }
            />
          </PreferenceRow>
        </div>
      ))}
    </>
  )
}
