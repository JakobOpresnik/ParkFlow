import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useUIStore } from '@/store/uiStore'

import { LotsSection } from './LotsSection'
import { SpotsSection } from './SpotsSection'

// — main component —

export function AdminPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setMoreOpen = useUIStore((s) => s.setMoreDrawerOpen)

  function handleBack() {
    setMoreOpen(true)
    void navigate({ to: '/' })
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex cursor-pointer items-center gap-1 sm:hidden"
          style={{ fontSize: 12 }}
        >
          <ArrowLeft className="size-3.5" />
          {t('common.back')}
        </button>
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
