import { notifications } from '@mantine/notifications'
import { Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDeleteOwner, useOwners } from '@/hooks/useOwners'
import type { Owner } from '@/types'

import { OwnerDeleteDialog } from './OwnerDeleteDialog'
import { OwnerForm } from './OwnerForm'
import { OwnerLinkDialog } from './OwnerLinkDialog'
import { OwnerTableSection } from './OwnerTableSection'
import { useOwnerDialog } from './useOwnerDialog'
import { useOwnerLinkDialog } from './useOwnerLinkDialog'

// — main component —

export function OwnersPage() {
  const { data: owners = [], isLoading } = useOwners()
  const deleteOwner = useDeleteOwner()

  const [ownerSearch, setOwnerSearch] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    form,
    setForm,
    dialogMode,
    isSaving,
    openAdd,
    openEdit,
    closeDialog,
    handleSubmit,
  } = useOwnerDialog()

  const {
    linkTarget,
    isLinkDialogOpen,
    linkUsername,
    setLinkUsername,
    isLinking,
    openLink,
    handleLink,
    closeLink,
  } = useOwnerLinkDialog(owners)

  const filteredOwners = useMemo(() => {
    if (!ownerSearch.trim()) return owners
    const q = ownerSearch.toLowerCase()
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.email?.toLowerCase().includes(q) ?? false) ||
        (o.phone?.toLowerCase().includes(q) ?? false) ||
        (o.vehicle_plate?.toLowerCase().includes(q) ?? false),
    )
  }, [owners, ownerSearch])

  const deleteTarget = owners.find((o) => o.id === deleteTargetId)

  function handleDelete(owner: Owner) {
    setDeleteTargetId(owner.id)
  }

  function handleConfirmDelete() {
    if (!deleteTargetId) return
    const targetName = deleteTarget?.name
    deleteOwner.mutate(deleteTargetId, {
      onSuccess: () => {
        notifications.show({ message: `${targetName} removed`, color: 'green' })
        setDeleteTargetId(null)
      },
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : 'Failed to delete owner',
          color: 'red',
        }),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Owners</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage parking spot owners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              placeholder="Search owners..."
              className="h-8 w-52 pr-7 pl-8 text-sm"
            />
            {ownerSearch && (
              <button
                onClick={() => setOwnerSearch('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={openAdd} className="gap-2">
            <Plus className="size-4" />
            Add Owner
          </Button>
        </div>
      </div>

      <OwnerTableSection
        isLoading={isLoading}
        filteredOwners={filteredOwners}
        ownerSearch={ownerSearch}
        onEdit={openEdit}
        onLink={openLink}
        onDelete={handleDelete}
      />

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Add Owner' : 'Edit Owner'}
            </DialogTitle>
          </DialogHeader>
          <OwnerForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {dialogMode === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OwnerDeleteDialog
        ownerName={deleteTarget?.name}
        isOpen={deleteTargetId !== null}
        isPending={deleteOwner.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />

      <OwnerLinkDialog
        ownerName={linkTarget?.name}
        isOpen={isLinkDialogOpen}
        isPending={isLinking}
        username={linkUsername}
        onUsernameChange={setLinkUsername}
        onConfirm={handleLink}
        onClose={closeLink}
      />
    </div>
  )
}
