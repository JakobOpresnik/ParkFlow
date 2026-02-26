import * as React from 'react'
import { Button as MantineButton, UnstyledButton } from '@mantine/core'
import { cn } from '@/lib/utils'

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg'

type MantineVariant = 'filled' | 'outline' | 'light' | 'subtle' | 'transparent'

function resolveVariant(variant: ButtonVariant): {
  mantineVariant: MantineVariant
  color?: string
} {
  switch (variant) {
    case 'default':
      return { mantineVariant: 'filled' }
    case 'destructive':
      return { mantineVariant: 'filled', color: 'red' }
    case 'outline':
      return { mantineVariant: 'outline' }
    case 'secondary':
      return { mantineVariant: 'light' }
    case 'ghost':
      return { mantineVariant: 'subtle' }
    case 'link':
      return { mantineVariant: 'transparent' }
  }
}

// Icon-only sizes need a square button via className since Mantine doesn't have an icon size
const ICON_SIZE_CLASS: Partial<Record<ButtonSize, string>> = {
  icon: 'size-9 p-0',
  'icon-xs': 'size-6 p-0',
  'icon-sm': 'size-8 p-0',
  'icon-lg': 'size-10 p-0',
}

const MANTINE_SIZE: Partial<Record<ButtonSize, string>> = {
  default: 'md',
  xs: 'xs',
  sm: 'sm',
  lg: 'lg',
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  disabled,
  children,
  onClick,
  type = 'button',
  'aria-label': ariaLabel,
  title,
  asChild: _asChild,
  ...rest
}: React.ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}) {
  const { mantineVariant, color } = resolveVariant(variant)
  const iconClass = ICON_SIZE_CLASS[size]
  const mantineSize = MANTINE_SIZE[size] ?? 'md'

  if (iconClass) {
    // Icon buttons: use UnstyledButton + full Tailwind control
    return (
      <UnstyledButton
        disabled={disabled}
        onClick={onClick}
        type={type}
        aria-label={ariaLabel}
        title={title}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50',
          'hover:bg-accent hover:text-accent-foreground',
          iconClass,
          className,
        )}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </UnstyledButton>
    )
  }

  return (
    <MantineButton
      variant={mantineVariant}
      color={color}
      size={mantineSize as 'xs' | 'sm' | 'md' | 'lg'}
      disabled={disabled}
      onClick={onClick}
      type={type}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </MantineButton>
  )
}

export { Button }
