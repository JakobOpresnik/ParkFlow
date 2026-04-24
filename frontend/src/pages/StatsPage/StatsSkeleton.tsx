export function StatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {([0, 1, 2] as const).map((k) => (
          <div
            key={k}
            className="bg-muted h-[124px] animate-pulse rounded-lg border"
          />
        ))}
      </div>

      {/* Donut + breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-muted h-[320px] animate-pulse rounded-lg border" />
        <div className="bg-muted h-[320px] animate-pulse rounded-lg border" />
      </div>

      {/* Floor breakdown */}
      <div className="bg-muted h-[220px] animate-pulse rounded-lg border" />

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-muted h-[240px] animate-pulse rounded-lg border" />
        <div className="bg-muted h-[240px] animate-pulse rounded-lg border" />
      </div>
    </div>
  )
}
