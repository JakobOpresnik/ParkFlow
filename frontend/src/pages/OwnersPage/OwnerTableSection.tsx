import { Users } from 'lucide-react'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Owner } from '@/types'

import { OwnerRow } from './OwnerRow'

// — types —

interface OwnerTableSectionProps {
  readonly isLoading: boolean
  readonly filteredOwners: Owner[]
  readonly ownerSearch: string
  readonly onEdit: (owner: Owner) => void
  readonly onLink: (owner: Owner) => void
  readonly onDelete: (owner: Owner) => void
}

// — main component —

export function OwnerTableSection({
  isLoading,
  filteredOwners,
  ownerSearch,
  onEdit,
  onLink,
  onDelete,
}: OwnerTableSectionProps) {
  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>
  }

  if (filteredOwners.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <Users className="text-muted-foreground mx-auto mb-3 size-8" />
        <p className="text-muted-foreground">
          {ownerSearch.trim()
            ? 'No owners match your search.'
            : 'No owners yet. Add the first one.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Plate</TableHead>
            <TableHead>SSO User</TableHead>
            <TableHead className="bg-card before:bg-border sticky right-0 w-[100px] text-center before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOwners.map((owner) => (
            <OwnerRow
              key={owner.id}
              owner={owner}
              ownerSearch={ownerSearch}
              onEdit={onEdit}
              onLink={onLink}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
