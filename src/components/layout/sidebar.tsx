import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clienti', icon: Building2 },
  { to: '/contacts', label: 'Contatti', icon: Users },
  { to: '/deals', label: 'Pipeline', icon: Kanban },
  { to: '/tasks', label: 'Attivita', icon: CheckSquare },
  { to: '/settings', label: 'Impostazioni', icon: Settings },
] as const

export function Sidebar() {
  const { tenant, member, signOut } = useAuthStore()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: tenant?.primary_color ?? '#3B82F6' }}
        >
          <span className="text-sm font-bold text-white">DC</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {tenant?.name ?? 'DanCRM'}
          </p>
          <p className="truncate text-xs text-slate-500">
            {member?.role ?? ''}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to || currentPath.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t px-3 py-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </aside>
  )
}
