// — types —

interface StatCardProps {
  readonly label: string
  readonly value: number | string
  readonly icon: React.ElementType
  readonly colorClass: string
}

// — main component —

export function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: StatCardProps) {
  return (
    <div className="bg-card rounded-lg border p-4 text-center shadow-sm">
      <div
        className={`mx-auto mb-3 flex size-10 items-center justify-center rounded-full ${colorClass}`}
      >
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
    </div>
  )
}
