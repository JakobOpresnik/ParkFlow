import { Input } from '@/components/ui/input'
import type { ParkingLot } from '@/types'

// — types —

export type LotFormData = Omit<ParkingLot, 'id' | 'created_at'>

interface LotFormProps {
  readonly value: LotFormData
  readonly onChange: (v: LotFormData) => void
}

// — main component —

export function LotForm({ value, onChange }: LotFormProps) {
  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor="lot-name" className="mb-1 block text-sm font-medium">
          Name *
        </label>
        <Input
          id="lot-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Zunaj"
        />
      </div>
      <div>
        <label
          htmlFor="lot-image-filename"
          className="mb-1 block text-sm font-medium"
        >
          Image filename
        </label>
        <Input
          id="lot-image-filename"
          value={value.image_filename}
          onChange={(e) =>
            onChange({ ...value, image_filename: e.target.value })
          }
          placeholder="parking-map-outside.png"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Place the image in <code>frontend/public/</code>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="lot-image-width"
            className="mb-1 block text-sm font-medium"
          >
            Image width (px)
          </label>
          <Input
            id="lot-image-width"
            type="number"
            value={value.image_width}
            onChange={(e) =>
              onChange({
                ...value,
                image_width: Number.parseInt(e.target.value) || 1200,
              })
            }
          />
        </div>
        <div>
          <label
            htmlFor="lot-image-height"
            className="mb-1 block text-sm font-medium"
          >
            Image height (px)
          </label>
          <Input
            id="lot-image-height"
            type="number"
            value={value.image_height}
            onChange={(e) =>
              onChange({
                ...value,
                image_height: Number.parseInt(e.target.value) || 700,
              })
            }
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Sort order</label>
        <Input
          type="number"
          value={value.sort_order}
          onChange={(e) =>
            onChange({
              ...value,
              sort_order: Number.parseInt(e.target.value) || 0,
            })
          }
        />
      </div>
    </div>
  )
}
