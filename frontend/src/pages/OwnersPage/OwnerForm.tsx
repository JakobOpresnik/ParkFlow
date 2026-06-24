import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'

import type { OwnerFormData, OwnerFormProps } from './types'

export function OwnerForm({ value, onChange }: OwnerFormProps) {
  const { t } = useTranslation()
  function field(key: keyof OwnerFormData) {
    return {
      value: value[key] ?? '',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        onChange({ ...value, [key]: e.target.value || null }),
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('owners.ownerNameLabel')}
        </label>
        <Input placeholder={t('owners.placeholderName')} {...field('name')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('owners.ownerEmailLabel')}
        </label>
        <Input
          type="email"
          placeholder={t('owners.placeholderEmail')}
          {...field('email')}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('owners.ownerPhoneLabel')}
        </label>
        <Input placeholder={t('owners.placeholderPhone')} {...field('phone')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('owners.ownerPlateLabel')}
        </label>
        <Input
          placeholder={t('owners.placeholderPlate')}
          {...field('vehicle_plate')}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('owners.ownerNotesLabel')}
        </label>
        <Input placeholder={t('owners.placeholderNotes')} {...field('notes')} />
      </div>
    </div>
  )
}
