import { StatusConfig } from './utils'

export function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      {(['free', 'occupied', 'reserved'] as const).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${StatusConfig[s].dot}`} />
          <span className="text-muted-foreground">{StatusConfig[s].label}</span>
        </div>
      ))}
    </div>
  )
}
