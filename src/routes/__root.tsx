import { createRootRoute, Outlet } from '@tanstack/react-router'
import Layout from '@/components/Layout'
import ToastListener from '@/components/Toast'

export const Route = createRootRoute({
  component: () => (
    <Layout>
      <ToastListener />
      <Outlet />
    </Layout>
  ),
})
