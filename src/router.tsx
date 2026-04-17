import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { ClientsPage } from '@/pages/clients/index'
import { ClientDetailPage } from '@/pages/clients/detail'
import { ContactsPage } from '@/pages/contacts'
import { ContactDetailPage } from '@/pages/contacts/detail'
import { DealsPage } from '@/pages/deals/index'
import { DealDetailPage } from '@/pages/deals/detail'
import { TasksPage } from '@/pages/tasks'
import { SettingsPage } from '@/pages/settings'
import { useAuthStore } from '@/stores/auth'

const rootRoute = createRootRoute()

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const { session } = useAuthStore.getState()
    if (session) throw redirect({ to: '/dashboard' })
  },
})

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: AppLayout,
  beforeLoad: () => {
    const { session } = useAuthStore.getState()
    if (!session) throw redirect({ to: '/login' })
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const clientsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/clients',
  component: ClientsPage,
})

const clientDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/clients/$id',
  component: ClientDetailPage,
})

const contactsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/contacts',
  component: ContactsPage,
})

const contactDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/contacts/$id',
  component: ContactDetailPage,
})

const dealsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/deals',
  component: DealsPage,
})

const dealDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/deals/$id',
  component: DealDetailPage,
})

const tasksRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/tasks',
  component: TasksPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: SettingsPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    clientsRoute,
    clientDetailRoute,
    contactsRoute,
    contactDetailRoute,
    dealsRoute,
    dealDetailRoute,
    tasksRoute,
    settingsRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
