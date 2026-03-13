import { Hash, ShieldCheck, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import { getInitials } from './utils'

// — types —

interface UserProfileCardProps {
  readonly user: {
    readonly id: string
    readonly username: string
    readonly displayName: string
    readonly role: string
  }
  readonly totalBookings: number
  readonly utilizationPct: number
  readonly uniqueFloors: string[]
  readonly isLoading: boolean
}

// — main component —

export function UserProfileCard({
  user,
  totalBookings,
  utilizationPct,
  uniqueFloors,
  isLoading,
}: UserProfileCardProps) {
  const initials = getInitials(user.displayName)
  return (
    <div className="bg-card rounded-lg border p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold">
          {initials}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{user.displayName}</h2>
            {user.role === 'admin' && (
              <Badge className="border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <ShieldCheck className="mr-1 size-3" />
                Admin
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" />
              {user.username}
            </span>
            <span className="flex items-center gap-1.5">
              <Hash className="size-3.5" />
              <span className="font-mono text-xs">{user.id}</span>
            </span>
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Total Bookings
            </p>
            <p className="mt-1 text-lg font-bold">{totalBookings}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Utilization
            </p>
            <p className="mt-1 text-lg font-bold">{utilizationPct}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Floors Used
            </p>
            <p className="mt-1 text-lg font-bold">
              {uniqueFloors.length > 0 ? uniqueFloors.join(', ') : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
