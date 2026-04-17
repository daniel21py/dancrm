import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Building2, Users, Kanban, CheckSquare,
  LayoutDashboard, Settings, ArrowRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Company, Contact, Deal } from '@/types/database'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  type: 'page' | 'company' | 'contact' | 'deal' | 'action'
  label: string
  sublabel?: string
  icon: React.ReactNode
  href?: string
  onSelect?: () => void
}

const PAGES: CommandItem[] = [
  { id: 'dashboard', type: 'page', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, href: '/dashboard' },
  { id: 'clients', type: 'page', label: 'Clienti', icon: <Building2 className="h-4 w-4" />, href: '/clients' },
  { id: 'contacts', type: 'page', label: 'Contatti', icon: <Users className="h-4 w-4" />, href: '/contacts' },
  { id: 'deals', type: 'page', label: 'Pipeline', icon: <Kanban className="h-4 w-4" />, href: '/deals' },
  { id: 'tasks', type: 'page', label: 'Attivita', icon: <CheckSquare className="h-4 w-4" />, href: '/tasks' },
  { id: 'settings', type: 'page', label: 'Impostazioni', icon: <Settings className="h-4 w-4" />, href: '/settings' },
]

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data: searchResults } = useQuery({
    queryKey: ['cmd-search', query],
    queryFn: async () => {
      if (query.length < 2) return { companies: [], contacts: [], deals: [] }
      const q = `%${query}%`
      const [companies, contacts, deals] = await Promise.all([
        supabase.from('companies').select('id, name, city, status').ilike('name', q).limit(4),
        supabase.from('contacts').select('id, first_name, last_name, email, job_title').or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`).limit(4),
        supabase.from('deals').select('id, title, value').ilike('title', q).limit(3),
      ])
      return {
        companies: (companies.data ?? []) as Pick<Company, 'id' | 'name' | 'city' | 'status'>[],
        contacts: (contacts.data ?? []) as Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'job_title'>[],
        deals: (deals.data ?? []) as Pick<Deal, 'id' | 'title' | 'value'>[],
      }
    },
    enabled: open && query.length >= 2,
  })

  const items: CommandItem[] = (() => {
    if (query.length < 2) {
      return PAGES
    }
    const results: CommandItem[] = []
    searchResults?.companies.forEach(c => results.push({
      id: `company-${c.id}`, type: 'company',
      label: c.name,
      sublabel: c.city ?? undefined,
      icon: <Building2 className="h-4 w-4" />,
      href: `/clients/${c.id}`,
    }))
    searchResults?.contacts.forEach(c => results.push({
      id: `contact-${c.id}`, type: 'contact',
      label: `${c.first_name} ${c.last_name}`,
      sublabel: c.job_title ?? c.email ?? undefined,
      icon: <Users className="h-4 w-4" />,
      href: `/contacts/${c.id}`,
    }))
    searchResults?.deals.forEach(d => results.push({
      id: `deal-${d.id}`, type: 'deal',
      label: d.title,
      sublabel: d.value ? `€${d.value.toLocaleString('it-IT')}` : undefined,
      icon: <Kanban className="h-4 w-4" />,
      href: `/deals/${d.id}`,
    }))
    if (results.length === 0) {
      results.push({
        id: 'no-result', type: 'action',
        label: `Cerca "${query}"...`,
        icon: <Search className="h-4 w-4 text-muted-foreground" />,
      })
    }
    return results
  })()

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.href) {
      navigate({ to: item.href as never })
    }
    item.onSelect?.()
    setOpen(false)
    setQuery('')
  }, [navigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        setQuery('')
        setSelected(0)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); if (items[selected]) handleSelect(items[selected]) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, items, selected, handleSelect])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else document.body.style.overflow = ''
  }, [open])

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => { setOpen(false); setQuery('') }}
          />
          <motion.div
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cerca clienti, contatti, deal... o naviga"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-2xs text-muted-foreground sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
              {query.length < 2 && (
                <p className="px-2 pb-1 pt-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                  Navigazione rapida
                </p>
              )}
              {items.map((item, i) => (
                <button
                  key={item.id}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    i === selected ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => handleSelect(item)}
                >
                  <span className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md',
                    item.type === 'company' ? 'bg-blue-500/10 text-blue-400' :
                    item.type === 'contact' ? 'bg-emerald-500/10 text-emerald-400' :
                    item.type === 'deal' ? 'bg-violet-500/10 text-violet-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    {item.sublabel && (
                      <span className="block truncate text-2xs text-muted-foreground">{item.sublabel}</span>
                    )}
                  </span>
                  {i === selected && item.href && (
                    <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border px-4 py-2">
              <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                <span><kbd className="rounded border border-border px-1 py-0.5">↑↓</kbd> naviga</span>
                <span><kbd className="rounded border border-border px-1 py-0.5">↵</kbd> seleziona</span>
                <span><kbd className="rounded border border-border px-1 py-0.5">⌘K</kbd> apri/chiudi</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
        )
      }}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/25 hover:text-foreground"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Cerca...</span>
      <kbd className="ml-1 rounded border border-border px-1.5 py-0.5 text-2xs">⌘K</kbd>
    </button>
  )
}
