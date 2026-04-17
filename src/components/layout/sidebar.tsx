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
  Search,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { Avatar } from '@/components/ui/avatar'
import { SdqLogo } from '@/components/sdq-logo'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clienti', icon: Building2 },
  { to: '/contacts', label: 'Contatti', icon: Users },
  { to: '/deals', label: 'Pipeline', icon: Kanban },
  { to: '/tasks', label: 'Attività', icon: CheckSquare },
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
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    )
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <SdqLogo className="h-8 w-8" />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-tight">
              {tenant?.name ?? 'DanCRM'}
            </span>
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              SDQ · Sameday
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-muted-foreground lg:hidden hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={openCommandPalette}
          className="group flex w-full items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5 transition-colors group-hover:text-primary" />
          <span className="flex-1 text-left">Cerca ovunque…</span>
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="px-3">
        <p className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            currentPath === to || currentPath.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent ring-1 ring-primary/20"
                  transition={{
                    type: 'spring',
                    duration: 0.35,
                    bounce: 0.15,
                  }}
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-dot"
                  className="absolute -left-1 top-1/2 h-3 -translate-y-1/2 rounded-full bg-primary"
                  style={{ width: 2 }}
                  transition={{
                    type: 'spring',
                    duration: 0.35,
                    bounce: 0.15,
                  }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 h-4 w-4 transition-colors',
                  isActive && 'text-primary',
                )}
              />
              <span className="relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border/60 px-3 py-2">
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
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </div>

      <div className="border-t border-border/60 px-3 py-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 ring-1 ring-border/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={member?.full_name ?? 'U'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                {member?.full_name ?? 'Utente'}
              </p>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                {member?.role ?? 'member'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
      <aside className="surface-glass hidden h-screen w-[232px] flex-shrink-0 flex-col border-r border-border/60 lg:flex">
        {sidebarContent}
      </aside>

      <div className="surface-glass fixed left-0 top-0 z-40 flex h-12 w-full items-center gap-2 border-b border-border/60 px-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <SdqLogo className="h-6 w-6" />
          <span className="text-sm font-semibold">
            {tenant?.name ?? 'DanCRM'}
          </span>
        </div>
      </div>

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
