import * as React from 'react'
import { Switch as MantineSwitch } from '@mantine/core'

function Switch({
  size = 'default',
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<typeof MantineSwitch>, 'onChange' | 'size'> & {
  size?: 'sm' | 'default'
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <MantineSwitch
      size={size === 'sm' ? 'sm' : 'md'}
      onChange={(e) => onCheckedChange?.(e.currentTarget.checked)}
      {...props}
    />
  )
}

export { Switch }
