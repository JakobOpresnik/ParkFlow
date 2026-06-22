import { cn } from '@/lib/utils'

// Thin bar showing how far an active booking has moved through its time window.
// Decorative — the surrounding countdown text carries the actual value.
export function ExpiryProgress({
  pct,
  className,
}: {
  readonly pct: number
  readonly className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'h-1 w-full overflow-hidden rounded-full bg-green-500/15',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-green-500/60 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
