import { useMantineColorScheme } from '@mantine/core'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleColorScheme()}
      aria-label="Toggle theme"
    >
      {colorScheme === 'dark' ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  )
}
