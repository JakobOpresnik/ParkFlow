import * as React from 'react'
import { Badge as MantineBadge } from '@mantine/core'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

function resolveVariant(variant: BadgeVariant): {
  mantineVariant: 'filled' | 'light' | 'outline' | 'transparent'
  color?: string
} {
  switch (variant) {
    case 'default':
      return { mantineVariant: 'filled' }
    case 'secondary':
      return { mantineVariant: 'light' }
    case 'destructive':
      return { mantineVariant: 'filled', color: 'red' }
    case 'outline':
      return { mantineVariant: 'outline' }
    case 'ghost':
    case 'link':
      return { mantineVariant: 'transparent' }
  }
}

function Badge({
  className,
  variant = 'default',
  children,
  asChild: _asChild,
  ...props
}: React.ComponentProps<'span'> & {
  variant?: BadgeVariant
  asChild?: boolean
}) {
  const { mantineVariant, color } = resolveVariant(variant)

  return (
    <MantineBadge
      variant={mantineVariant}
      color={color}
      className={cn('cursor-default', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MantineBadge>
  )
}

export { Badge }
