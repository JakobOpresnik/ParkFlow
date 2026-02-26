import { Select as MantineSelect } from '@mantine/core'
import { cn } from '@/lib/utils'

interface SelectItem {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  data: SelectItem[]
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  label?: string
  searchable?: boolean
  clearable?: boolean
}

function Select({
  data,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  label,
  searchable,
  clearable,
}: SelectProps) {
  return (
    <MantineSelect
      data={data}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      label={label}
      searchable={searchable}
      clearable={clearable}
      classNames={{ input: cn('w-full', className) }}
    />
  )
}

export { Select }
export type { SelectItem, SelectProps }
