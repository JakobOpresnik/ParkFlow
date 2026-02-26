import * as React from 'react'
import { Input as MantineInput } from '@mantine/core'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <MantineInput
      component="input"
      type={type}
      classNames={{ input: cn('w-full', className) }}
      {...(props as Record<string, unknown>)}
    />
  )
}

export { Input }
