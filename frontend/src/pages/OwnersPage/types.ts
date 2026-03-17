import type { Owner } from '@/types'

// — types —

export type OwnerFormData = Omit<Owner, 'id' | 'created_at'>

export interface OwnerFormProps {
  readonly value: OwnerFormData
  readonly onChange: (data: OwnerFormData) => void
}

export interface OwnerDeleteDialogProps {
  readonly ownerName: string | undefined
  readonly isOpen: boolean
  readonly isPending: boolean
  readonly onConfirm: () => void
  readonly onClose: () => void
}

export interface OwnerLinkDialogProps {
  readonly ownerName: string | undefined
  readonly isOpen: boolean
  readonly isPending: boolean
  readonly username: string
  readonly onUsernameChange: (value: string) => void
  readonly onConfirm: () => void
  readonly onClose: () => void
}
