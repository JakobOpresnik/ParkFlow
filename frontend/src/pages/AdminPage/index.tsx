import { useTranslation } from 'react-i18next'

import { LotsSection } from './LotsSection'
import { SpotsSection } from './SpotsSection'

// — main component —

export function AdminPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t('admin.subtitle')}
        </p>
      </div>
      <LotsSection />
      <div className="border-t pt-6">
        <SpotsSection />
      </div>
    </div>
  )
}
