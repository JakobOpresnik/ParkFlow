import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Spot, SpotStatus } from '@/types'

import { ALL_STATUSES, STATUS_CONFIG } from './constants'
import { useManagementAccordion } from './useManagementAccordion'
import { useNewOwnerForm } from './useNewOwnerForm'
import { useOwnerAssignment } from './useOwnerAssignment'

// — types —

interface ManagementAccordionProps {
  readonly spot: Spot
}

// — main component —

export function ManagementAccordion({ spot }: ManagementAccordionProps) {
  const { t } = useTranslation()

  const STATUS_LABELS: Record<SpotStatus, string> = {
    free: t('spotModal.available'),
    occupied: t('spotModal.occupied'),
    reserved: t('spotModal.reservedStatus'),
  }

  const {
    expanded,
    setExpanded,
    isPending: isStatusPending,
    handleStatusChange,
  } = useManagementAccordion(spot)

  const {
    assignOpen,
    setAssignOpen,
    selectedOwnerId,
    setSelectedOwnerId,
    owners,
    ownerSelectData,
    isPending: isAssignPending,
    handleUnassign,
    handleAssignConfirm,
  } = useOwnerAssignment(spot)

  const {
    createFormOpen,
    setCreateFormOpen,
    newName,
    setNewName,
    newPlate,
    setNewPlate,
    isPending: isCreatePending,
    handleCreateAndAssign,
  } = useNewOwnerForm(spot, () => {
    setExpanded(false)
    setAssignOpen(false)
    setSelectedOwnerId(null)
  })

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          {t('spotModal.manageSpot')}
        </span>
        {expanded ? (
          <ChevronUp className="text-muted-foreground size-4" />
        ) : (
          <ChevronDown className="text-muted-foreground size-4" />
        )}
      </button>

      {expanded && (
        <div className="space-y-5 border-t px-4 pt-4 pb-4">
          {/* Change status */}
          <div>
            <p className="text-muted-foreground mb-2.5 text-xs font-medium tracking-widest uppercase">
              {t('spotModal.statusSection')}
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  color={STATUS_CONFIG[s].color}
                  disabled={s === spot.status || isStatusPending}
                  onClick={() => handleStatusChange(s)}
                  className={
                    s === spot.status ? 'cursor-default opacity-40' : ''
                  }
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </div>

          {/* Assign owner */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                {spot.owner_name?.includes('/')
                  ? t('spotModal.owners')
                  : t('spotModal.owner')}
              </p>
              <div className="flex gap-1">
                {spot.owner_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 gap-1.5 text-xs"
                    disabled={isAssignPending}
                    onClick={handleUnassign}
                  >
                    <X className="size-3" />
                    {t('spotModal.unassign')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAssignOpen((v) => !v)
                    setCreateFormOpen(false)
                  }}
                >
                  {spot.owner_id
                    ? t('spotModal.change')
                    : t('spotModal.assign')}
                </Button>
              </div>
            </div>

            {assignOpen && (
              <div className="space-y-3 rounded-lg border p-3">
                {!createFormOpen ? (
                  <>
                    <Select
                      data={ownerSelectData}
                      value={selectedOwnerId}
                      onChange={setSelectedOwnerId}
                      placeholder={
                        owners.length === 0
                          ? t('spotModal.noOwnersYet')
                          : t('spotModal.selectOwnerPlaceholder')
                      }
                      disabled={owners.length === 0}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!selectedOwnerId || isAssignPending}
                        onClick={handleAssignConfirm}
                      >
                        {t('spotModal.confirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => setCreateFormOpen(true)}
                      >
                        <Plus className="size-3" />
                        {t('spotModal.newOwner')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      {t('spotModal.newOwner')}
                    </p>
                    <Input
                      placeholder={t('spotModal.namePlaceholder')}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                      placeholder={t('spotModal.vehiclePlatePlaceholder')}
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={!newName.trim() || isCreatePending}
                        onClick={handleCreateAndAssign}
                      >
                        {t('spotModal.createAndAssign')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCreateFormOpen(false)}
                      >
                        {t('spotModal.back')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
