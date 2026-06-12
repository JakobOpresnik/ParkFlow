import { ParkingCircle } from 'lucide-react'

import { NotificationBell } from './NotificationBell'

// Mobile-only top bar (hidden at >= sm, where the sidebar takes over). Gives
// phones a home for branding + the notification bell without crowding the
// bottom nav. Rendered in normal flow above the main content, so it never
// overlaps full-bleed pages (e.g. the map).
export function MobileHeader() {
  return (
    <header className="bg-card flex h-12 shrink-0 items-center border-b px-4 sm:hidden">
      <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg">
        <ParkingCircle className="text-primary size-4" />
      </div>
      <span className="ml-2.5 text-sm font-semibold tracking-tight">
        ParkFlow
      </span>
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  )
}
