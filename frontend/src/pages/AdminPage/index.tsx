import { LotsSection } from './LotsSection'
import { SpotsSection } from './SpotsSection'

// — main component —

export function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage parking lots and spots
        </p>
      </div>
      <LotsSection />
      <div className="border-t pt-6">
        <SpotsSection />
      </div>
    </div>
  )
}
