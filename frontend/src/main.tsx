import './index.css'
import '@/i18n'

import { createTheme, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from '@/lib/queryClient'
import { router } from '@/routeTree.gen.tsx'
import { useAuthStore } from '@/store/authStore'

const theme = createTheme({ primaryColor: 'violet', defaultRadius: 'md' })

// Validate stored token on startup
void useAuthStore.getState().initialize()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" autoClose={2000} w={320} />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
