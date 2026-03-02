import * as React from 'react'
import { Table as MantineTable } from '@mantine/core'
import { cn } from '@/lib/utils'

function Table({
  className,
  children,
  ...props
}: React.ComponentProps<'table'>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflows(el.scrollWidth > el.clientWidth)
    check()
    const obs = new ResizeObserver(check)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-overflow={overflows ? 'true' : undefined}
      className="group relative w-full overflow-x-auto"
    >
      <MantineTable
        className={cn('w-full caption-bottom text-sm', className)}
        {...(props as Record<string, unknown>)}
      >
        {children}
      </MantineTable>
    </div>
  )
}

function TableHeader({
  className,
  children,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <MantineTable.Thead
      className={cn('[&_tr]:border-b', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MantineTable.Thead>
  )
}

function TableBody({
  className,
  children,
  ...props
}: React.ComponentProps<'tbody'>) {
  return (
    <MantineTable.Tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MantineTable.Tbody>
  )
}

function TableRow({
  className,
  children,
  ...props
}: React.ComponentProps<'tr'>) {
  return (
    <MantineTable.Tr
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className,
      )}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MantineTable.Tr>
  )
}

function TableHead({
  className,
  children,
  ...props
}: React.ComponentProps<'th'>) {
  return (
    <MantineTable.Th
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap',
        className,
      )}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MantineTable.Th>
  )
}

function TableCell({
  className,
  children,
  ...props
}: React.ComponentProps<'td'>) {
  return (
    <MantineTable.Td
      className={cn('p-2 align-middle whitespace-nowrap', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MantineTable.Td>
  )
}

function TableCaption({
  className,
  children,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </caption>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
