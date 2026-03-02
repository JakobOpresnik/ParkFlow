import { useState } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useOwners,
  useCreateOwner,
  useUpdateOwner,
  useDeleteOwner,
} from '@/hooks/useOwners'
import { notifications } from '@mantine/notifications'
import type { Owner } from '@/types'

type OwnerFormData = Omit<Owner, 'id' | 'created_at'>

const EMPTY_FORM: OwnerFormData = {
  name: '',
  email: null,
  phone: null,
  vehicle_plate: null,
  notes: null,
}

function OwnerForm({
  value,
  onChange,
}: {
  value: OwnerFormData
  onChange: (v: OwnerFormData) => void
}) {
  function field(key: keyof OwnerFormData) {
    return {
      value: value[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ ...value, [key]: e.target.value || null }),
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Name *</label>
        <Input placeholder="Full name" {...field('name')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <Input
          type="email"
          placeholder="email@example.com"
          {...field('email')}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Phone</label>
        <Input placeholder="+386 40 123 456" {...field('phone')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Vehicle plate</label>
        <Input placeholder="LJ 12-345" {...field('vehicle_plate')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <Input placeholder="Optional note" {...field('notes')} />
      </div>
    </div>
  )
}

export function OwnersPage() {
  const { data: owners = [], isLoading } = useOwners()
  const createOwner = useCreateOwner()
  const updateOwner = useUpdateOwner()
  const deleteOwner = useDeleteOwner()

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<OwnerFormData>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null)

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setDialogMode('add')
  }

  function openEdit(owner: Owner) {
    setForm({
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      vehicle_plate: owner.vehicle_plate,
      notes: owner.notes,
    })
    setEditingId(owner.id)
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setEditingId(null)
  }

  function handleSubmit() {
    if (!form.name?.trim()) {
      notifications.show({ message: 'Name is required', color: 'red' })
      return
    }

    if (dialogMode === 'add') {
      createOwner.mutate(form, {
        onSuccess: () => {
          notifications.show({ message: 'Owner added', color: 'green' })
          closeDialog()
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to create owner',
            color: 'red',
          }),
      })
    } else if (dialogMode === 'edit' && editingId) {
      updateOwner.mutate(
        { id: editingId, data: form },
        {
          onSuccess: () => {
            notifications.show({ message: 'Owner updated', color: 'green' })
            closeDialog()
          },
          onError: (err) =>
            notifications.show({
              message:
                err instanceof Error ? err.message : 'Failed to update owner',
              color: 'red',
            }),
        },
      )
    }
  }

  function handleDelete(owner: Owner) {
    setDeleteTarget(owner)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteOwner.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          message: `${deleteTarget.name} removed`,
          color: 'green',
        })
        setDeleteTarget(null)
      },
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : 'Failed to delete owner',
          color: 'red',
        }),
    })
  }

  const isSaving = createOwner.isPending || updateOwner.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Owners</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage parking spot owners
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="size-4" />
          Add Owner
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : owners.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Users className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground">
            No owners yet. Add the first one.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead className="bg-card before:bg-border sticky right-0 w-[100px] text-center before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {owner.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {owner.phone ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {owner.vehicle_plate ?? '—'}
                  </TableCell>
                  <TableCell className="bg-card before:bg-border sticky right-0 before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(owner)}
                        aria-label="Edit owner"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(owner)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete owner"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Owner</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Remove <strong>{deleteTarget?.name}</strong>? Their parking spots
            will be unassigned.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteOwner.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
