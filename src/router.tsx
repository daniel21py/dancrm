import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { ClientsPage } from '@/pages/clients/index'
import { ContactsPage } from '@/pages/contacts'
import { DealsPage } from '@/pages/deals/index'
import { TasksPage } from '@/pages/tasks'
import { SettingsPage } from '@/pages/settings'
import { useAuthStore } from '@/stores/auth'

// Root route
const rootRoute = createRootRoute()

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const { session } = useAuthStore.getState()
    if (session) throw redirect({ to: '/dashboard' })
  },
})

// Authenticated layout route
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: AppLayout,
  beforeLoad: () => {
    const { session } = useAuthStore.getState()
    if (!session) throw redirect({ to: '/login' })
  },
})

// Dashboard
const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

// Clients
const clientsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/clients',
  component: ClientsPage,
})

// Contacts
const contactsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/contacts',
  component: ContactsPage,
})

// Deals
const dealsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/deals',
  component: DealsPage,
})

// Tasks
const tasksRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/tasks',
  component: TasksPage,
})

// Settings
const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: SettingsPage,
})

// Index redirect
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    clientsRoute,
    contactsRoute,
    dealsRoute,
    tasksRoute,
    settingsRoute,
  ]),
])

// Create the router
export const router = createRouter({ routeTree })

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
