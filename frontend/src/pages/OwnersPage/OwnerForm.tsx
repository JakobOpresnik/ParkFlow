import type { ChangeEvent } from 'react'

import { Input } from '@/components/ui/input'

import type { OwnerFormData, OwnerFormProps } from './types'

export function OwnerForm({ value, onChange }: OwnerFormProps) {
  function field(key: keyof OwnerFormData) {
    return {
      value: value[key] ?? '',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
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
      <div>
        <label className="mb-1 block text-sm font-medium">SSO Username</label>
        <Input placeholder="e.g. jnovak" {...field('user_id')} />
        <p className="text-muted-foreground mt-1 text-xs">
          Links this owner to their SSO account for &quot;My Parking&quot;
          access.
        </p>
      </div>
    </div>
  )
}
