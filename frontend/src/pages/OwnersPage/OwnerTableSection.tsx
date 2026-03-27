import { Link2, Pencil, Trash2, Unlink, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
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
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
    )
  }

  if (filteredOwners.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <Users className="text-muted-foreground mx-auto mb-3 size-8" />
        <p className="text-muted-foreground">
          {ownerSearch.trim()
            ? t('owners.noOwnersMatch')
            : t('owners.noOwnersYet')}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {filteredOwners.map((owner) => (
          <div
            key={owner.id}
            className="bg-card rounded-lg border p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{owner.name}</p>
                {owner.email && (
                  <p className="text-muted-foreground truncate text-xs">
                    {owner.email}
                  </p>
                )}
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 text-xs">
                  {owner.phone && <span>{owner.phone}</span>}
                  {owner.vehicle_plate && (
                    <span className="font-mono">{owner.vehicle_plate}</span>
                  )}
                </div>
                {owner.user_id ? (
                  <button
                    onClick={() => onLink(owner)}
                    className="text-primary mt-1 flex items-center gap-1 text-xs hover:underline"
                  >
                    <Link2 className="size-3 shrink-0" />
                    {owner.user_id}
                  </button>
                ) : (
                  <button
                    onClick={() => onLink(owner)}
                    className="text-muted-foreground mt-1 flex cursor-pointer items-center gap-1 text-xs hover:underline"
                  >
                    <Unlink className="size-3" />
                    {t('owners.notLinked')}
                  </button>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
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
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(owner)}
                  aria-label="Delete owner"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="bg-card hidden rounded-lg border shadow-sm sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('owners.nameHeader')}</TableHead>
              <TableHead>{t('owners.emailHeader')}</TableHead>
              <TableHead>{t('owners.phoneHeader')}</TableHead>
              <TableHead>{t('owners.plateHeader')}</TableHead>
              <TableHead>{t('owners.userHeader')}</TableHead>
              <TableHead className="bg-card before:bg-border sticky right-0 w-[100px] text-center before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
                {t('admin.actionsHeader')}
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
    </>
  )
}
