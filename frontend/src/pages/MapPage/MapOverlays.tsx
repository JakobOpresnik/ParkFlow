import { CalendarDays } from 'lucide-react'

// — types —

interface MapOverlaysProps {
  readonly isLoadingPresence: boolean
  readonly isLoadingData: boolean
  readonly isWorkFreeDay: boolean
  readonly selectedDate: string
}

// — main component —

export function MapOverlays({
  isLoadingPresence,
  isLoadingData,
  isWorkFreeDay,
  selectedDate,
}: MapOverlaysProps) {
  return (
    <>
      {isLoadingPresence && !isLoadingData && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-black/70 px-6 py-4 shadow-2xl backdrop-blur-md">
            <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm font-medium text-white">
              Loading timesheet data…
            </p>
          </div>
        </div>
      )}

      {isWorkFreeDay && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto rounded-2xl bg-black/70 px-8 py-5 text-center shadow-2xl backdrop-blur-md">
            <CalendarDays className="mx-auto mb-2 size-8 text-amber-400" />
            <p className="text-lg font-semibold text-white">Work-Free Day</p>
            <p className="mt-1 text-sm text-white/60">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              is a public holiday
            </p>
          </div>
        </div>
      )}
    </>
  )
}
