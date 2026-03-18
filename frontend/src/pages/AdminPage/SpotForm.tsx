import { Select } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import type { Owner, ParkingLot, SpotStatus, SpotType } from '@/types'

// — types —

export interface SpotFormData {
  number: string
  label: string
  lot_id: string
  status: SpotStatus
  type: SpotType
  owner_id: string
}

interface SpotFormProps {
  readonly value: SpotFormData
  readonly onChange: (v: SpotFormData) => void
  readonly lots: readonly ParkingLot[]
  readonly owners: readonly Owner[]
}

// — main component —

export function SpotForm({ value, onChange, lots, owners }: SpotFormProps) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t('admin.spotNumberLabel')}
          </label>
          <Input
            type="number"
            min={1}
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            placeholder="1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t('admin.spotLabelLabel')}
          </label>
          <Input
            value={value.label}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="A1"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('admin.spotLotLabel')}
        </label>
        <Select
          value={value.lot_id || null}
          onChange={(v) => onChange({ ...value, lot_id: v ?? '' })}
          data={lots.map((l) => ({ value: l.id, label: l.name }))}
          placeholder={t('admin.selectLot')}
          allowDeselect={false}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t('admin.spotStatusLabel')}
          </label>
          <Select
            value={value.status}
            onChange={(v) =>
              onChange({ ...value, status: (v ?? 'free') as SpotStatus })
            }
            data={[
              { value: 'free', label: t('admin.freeStatus') },
              { value: 'occupied', label: t('admin.occupiedStatus') },
              { value: 'reserved', label: t('admin.reservedStatus') },
            ]}
            allowDeselect={false}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t('admin.spotTypeLabel')}
          </label>
          <Select
            value={value.type}
            onChange={(v) =>
              onChange({ ...value, type: (v ?? 'standard') as SpotType })
            }
            data={[
              { value: 'standard', label: t('admin.standard') },
              { value: 'ev', label: t('admin.evCharging') },
              { value: 'handicap', label: t('admin.handicap') },
              { value: 'compact', label: t('admin.compact') },
            ]}
            allowDeselect={false}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {t('admin.spotOwnerLabel')}
        </label>
        <select
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          value={value.owner_id}
          onChange={(e) => onChange({ ...value, owner_id: e.target.value })}
        >
          <option value="">{t('admin.noOwner')}</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.user_id ? ` (${o.user_id})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
