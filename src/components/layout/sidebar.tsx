import { useState, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  CheckSquare,
  Settings,
  LogOut,
  Zap,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { Avatar } from '@/components/ui/avatar'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clienti', icon: Building2 },
  { to: '/contacts', label: 'Contatti', icon: Users },
  { to: '/deals', label: 'Pipeline', icon: Kanban },
  { to: '/tasks', label: 'Attivita', icon: CheckSquare },
] as const

const bottomItems = [
  { to: '/settings', label: 'Impostazioni', icon: Settings },
] as const

export function Sidebar() {
  const { tenant, member, signOut } = useAuthStore()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [currentPath])

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: tenant?.primary_color ?? '#3B82F6' }}
          >
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            {tenant?.name ?? 'DanCRM'}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-muted-foreground lg:hidden hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2 pb-2">
        <button
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-muted-foreground/25 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Cerca...</span>
          <kbd className="hidden rounded border border-border px-1 py-0.5 text-2xs sm:block">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to || currentPath.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent"
                  transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border px-2 py-2">
        {bottomItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </div>

      <div className="border-t border-border px-2 py-2">
        <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={member?.full_name ?? 'U'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{member?.full_name ?? 'Utente'}</p>
              <p className="truncate text-2xs text-muted-foreground">{member?.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Esci"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-[220px] flex-shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <div className="fixed left-0 top-0 z-40 flex h-12 w-full items-center gap-2 border-b border-border bg-card px-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: tenant?.primary_color ?? '#3B82F6' }}
          >
            <Zap className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold">{tenant?.name ?? 'DanCRM'}</span>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-card shadow-xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
