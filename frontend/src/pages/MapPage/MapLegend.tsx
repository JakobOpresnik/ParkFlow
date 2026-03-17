export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-free size-2.5 rounded-sm" />
        Free
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-occupied size-2.5 rounded-sm" />
        Occupied
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-reserved size-2.5 rounded-sm" />
        Reserved
      </span>
    </div>
  )
}
