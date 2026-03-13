import { Select } from '@mantine/core'

import { Input } from '@/components/ui/input'
import type { ParkingLot, SpotStatus, SpotType } from '@/types'

// — types —

export interface SpotFormData {
  number: string
  label: string
  lot_id: string
  status: SpotStatus
  type: SpotType
}

interface SpotFormProps {
  readonly value: SpotFormData
  readonly onChange: (v: SpotFormData) => void
  readonly lots: readonly ParkingLot[]
}

// — main component —

export function SpotForm({ value, onChange, lots }: SpotFormProps) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Number *</label>
          <Input
            type="number"
            min={1}
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            placeholder="1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Label</label>
          <Input
            value={value.label}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="A1"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Parking Lot *</label>
        <Select
          value={value.lot_id || null}
          onChange={(v) => onChange({ ...value, lot_id: v ?? '' })}
          data={lots.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="Select a lot…"
          allowDeselect={false}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <Select
            value={value.status}
            onChange={(v) =>
              onChange({ ...value, status: (v ?? 'free') as SpotStatus })
            }
            data={[
              { value: 'free', label: 'Free' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'reserved', label: 'Reserved' },
            ]}
            allowDeselect={false}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <Select
            value={value.type}
            onChange={(v) =>
              onChange({ ...value, type: (v ?? 'standard') as SpotType })
            }
            data={[
              { value: 'standard', label: 'Standard' },
              { value: 'ev', label: 'EV Charging' },
              { value: 'handicap', label: 'Handicap' },
              { value: 'compact', label: 'Compact' },
            ]}
            allowDeselect={false}
          />
        </div>
      </div>
    </div>
  )
}
