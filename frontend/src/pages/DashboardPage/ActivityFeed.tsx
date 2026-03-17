import { Activity } from 'lucide-react'

import type { SpotChange, SpotChangeType } from '@/types'

// — types —

interface ActivityFeedProps {
  readonly changes: readonly SpotChange[]
  readonly isLoading: boolean
}

// — helpers —

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getChangeDotClass(
  changeType: SpotChangeType,
  newValue: string | null,
): string {
  if (changeType === 'status_changed') {
    if (newValue === 'free') return 'bg-spot-free'
    if (newValue === 'occupied') return 'bg-spot-occupied'
    if (newValue === 'reserved') return 'bg-spot-reserved'
  }
  if (changeType === 'owner_assigned') return 'bg-primary'
  return 'bg-muted-foreground/40'
}

function getChangeDescription(
  changeType: SpotChangeType,
  newValue: string | null,
): string {
  if (changeType === 'status_changed' && newValue) return `→ ${newValue}`
  if (changeType === 'owner_assigned' && newValue) return `owner → ${newValue}`
  if (changeType === 'owner_unassigned') return 'owner removed'
  return changeType.replace(/_/g, ' ')
}

// — main component —

export function ActivityFeed({ changes, isLoading }: ActivityFeedProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <p className="text-muted-foreground text-xs">
          Last 50 · auto-refreshes every 15s
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 4].map((i) => (
            <div key={i} className="bg-muted h-8 animate-pulse rounded" />
          ))}
        </div>
      )}

      {!isLoading && changes.length === 0 && (
        <div className="p-8 text-center">
          <Activity className="text-muted-foreground mx-auto mb-2 size-6" />
          <p className="text-muted-foreground text-sm">
            No activity yet. Assign owners or change statuses to see events
            here.
          </p>
        </div>
      )}

      {!isLoading && changes.length > 0 && (
        <div className="divide-y">
          {changes.map((change) => (
            <div key={change.id} className="flex items-start gap-3 px-4 py-2.5">
              <div
                className={`mt-[7px] size-1.5 shrink-0 rounded-full ${getChangeDotClass(change.change_type, change.new_value)}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className="text-sm font-medium">
                    #{change.spot_number}
                  </span>
                  {change.spot_label && (
                    <span className="text-muted-foreground text-xs">
                      {change.spot_label}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {getChangeDescription(change.change_type, change.new_value)}
                  </span>
                </div>
              </div>
              <time
                className="text-muted-foreground mt-0.5 shrink-0 text-xs whitespace-nowrap"
                title={formatAbsoluteTime(change.changed_at)}
              >
                {formatRelativeTime(change.changed_at)}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
