import { useTranslation } from 'react-i18next'

import type { CoordControlsProps, CoordControlsValue } from './types'
import { LABEL_POSITIONS, LABEL_ROTATIONS } from './utils'

// — sub-components —

export function CoordControls<T extends CoordControlsValue>({
  value,
  onChange,
}: CoordControlsProps<T>) {
  const { t } = useTranslation()
  return (
    <>
      {/* Label position */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs">
          {t('mapEditor.labelPosition')}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {LABEL_POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => onChange({ labelPosition: pos } as Partial<T>)}
              className={`rounded border py-1 text-xs capitalize transition-colors ${
                value.labelPosition === pos
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Label rotation */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs">
          {t('mapEditor.labelRotation')}
        </p>
        <div className="flex gap-1">
          {LABEL_ROTATIONS.map((deg) => (
            <button
              key={deg}
              onClick={() => onChange({ labelRotation: deg } as Partial<T>)}
              className={`flex-1 rounded border py-1 text-xs transition-colors ${
                value.labelRotation === deg
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Rectangle rotation */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {t('mapEditor.rectRotation')}
          </p>
          <span className="font-mono text-xs">{value.rotation}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={value.rotation}
          onChange={(e) =>
            onChange({
              rotation: Number.parseInt(e.target.value, 10),
            } as Partial<T>)
          }
          className="accent-primary w-full"
        />
        <div className="flex flex-wrap gap-1">
          {[0, 45, 90, 135, 180].map((deg) => (
            <button
              key={deg}
              onClick={() => onChange({ rotation: deg } as Partial<T>)}
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                value.rotation === deg
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
