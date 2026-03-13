import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Spot } from '@/types'

import { ALL_STATUSES, STATUS_CONFIG } from './constants'
import { useManagementAccordion } from './useManagementAccordion'

// — types —

interface ManagementAccordionProps {
  readonly spot: Spot
}

// — main component —

export function ManagementAccordion({ spot }: ManagementAccordionProps) {
  const {
    expanded,
    setExpanded,
    assignOpen,
    setAssignOpen,
    selectedOwnerId,
    setSelectedOwnerId,
    createFormOpen,
    setCreateFormOpen,
    newName,
    setNewName,
    newPlate,
    setNewPlate,
    owners,
    ownerSelectData,
    isPending,
    handleStatusChange,
    handleUnassign,
    handleAssignConfirm,
    handleCreateAndAssign,
  } = useManagementAccordion(spot)

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Manage spot
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
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  color={STATUS_CONFIG[s].color}
                  disabled={s === spot.status || isPending}
                  onClick={() => handleStatusChange(s)}
                  className={
                    s === spot.status ? 'cursor-default opacity-40' : ''
                  }
                >
                  {STATUS_CONFIG[s].label}
                </Button>
              ))}
            </div>
          </div>

          {/* Assign owner */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                {spot.owner_name?.includes('/') ? 'Owners' : 'Owner'}
              </p>
              <div className="flex gap-1">
                {spot.owner_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 gap-1.5 text-xs"
                    disabled={isPending}
                    onClick={handleUnassign}
                  >
                    <X className="size-3" />
                    Unassign
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
                  {spot.owner_id ? 'Change' : 'Assign'}
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
                        owners.length === 0 ? 'No owners yet' : 'Select owner…'
                      }
                      disabled={owners.length === 0}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!selectedOwnerId || isPending}
                        onClick={handleAssignConfirm}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => setCreateFormOpen(true)}
                      >
                        <Plus className="size-3" />
                        New owner
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">New owner</p>
                    <Input
                      placeholder="Name *"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                      placeholder="Vehicle plate (optional)"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={!newName.trim() || isPending}
                        onClick={handleCreateAndAssign}
                      >
                        Create & Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCreateFormOpen(false)}
                      >
                        Back
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
