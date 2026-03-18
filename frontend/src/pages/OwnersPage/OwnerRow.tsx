import { Link2, Pencil, Trash2, Unlink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Highlight } from '@/components/ui/highlight'
import { TableCell, TableRow } from '@/components/ui/table'
import type { Owner } from '@/types'

// — helpers —

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  let national: string
  if (digits.startsWith('386') && digits.length === 11) {
    national = digits.slice(3)
  } else if (digits.startsWith('0') && digits.length === 9) {
    national = digits.slice(1)
  } else if (digits.length === 8) {
    national = digits
  } else {
    return raw
  }
  return `+386 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`
}

// — types —

interface OwnerRowProps {
  readonly owner: Owner
  readonly ownerSearch: string
  readonly onEdit: (owner: Owner) => void
  readonly onLink: (owner: Owner) => void
  readonly onDelete: (owner: Owner) => void
}

// — main component —

export function OwnerRow({
  owner,
  ownerSearch,
  onEdit,
  onLink,
  onDelete,
}: OwnerRowProps) {
  const { t } = useTranslation()
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Highlight text={owner.name} query={ownerSearch} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {owner.email ? (
          <Highlight text={owner.email} query={ownerSearch} />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {owner.phone ? (
          <Highlight text={formatPhone(owner.phone)} query={ownerSearch} />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {owner.vehicle_plate ? (
          <Highlight text={owner.vehicle_plate} query={ownerSearch} />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        {owner.user_id ? (
          <button
            onClick={() => onLink(owner)}
            className="text-primary flex items-center gap-1 text-sm hover:underline"
          >
            <Link2 className="size-3" />
            {owner.user_id}
          </button>
        ) : (
          <button
            onClick={() => onLink(owner)}
            className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
          >
            <Unlink className="size-3" />
            {t('owners.notLinked')}
          </button>
        )}
      </TableCell>
      <TableCell className="bg-card before:bg-border sticky right-0 before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(owner)}
            aria-label="Edit owner"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(owner)}
            className="text-destructive hover:text-destructive"
            aria-label="Delete owner"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
