import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, Phone, Mail, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Contact, ContactRole, Company } from '@/types/database'
import { cn, formatDateRelative, getInitials } from '@/lib/utils'

const roleLabels: Record<ContactRole, { label: string; className: string }> = {
  decisore: { label: 'Decisore', className: 'bg-violet-100 text-violet-700' },
  operativo: { label: 'Operativo', className: 'bg-blue-100 text-blue-700' },
  referente: { label: 'Referente', className: 'bg-emerald-100 text-emerald-700' },
  altro: { label: 'Altro', className: 'bg-slate-100 text-slate-700' },
}

export function ContactsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data as (Contact & { company: Pick<Company, 'id' | 'name'> | null })[]
    },
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      return (data ?? []) as Pick<Company, 'id' | 'name'>[]
    },
  })

  const createContact = useMutation({
    mutationFn: async (contact: Partial<Contact>) => {
      const { data, error } = await supabase.from('contacts').insert(contact).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowForm(false)
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatti</h1>
          <p className="text-sm text-slate-500">{contacts.length} contatti</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuovo contatto
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, email..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-1 text-lg font-semibold text-slate-900">Nessun contatto</h3>
          <p className="text-sm text-slate-500">Aggiungi il tuo primo contatto.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(`${contact.first_name} ${contact.last_name}`)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.job_title && (
                    <p className="truncate text-xs text-slate-500">{contact.job_title}</p>
                  )}
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleLabels[contact.role].className)}>
                  {roleLabels[contact.role].label}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500">
                {contact.company && (
                  <p className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    {contact.company.name}
                  </p>
                )}
                {contact.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </p>
                )}
                {(contact.phone || contact.mobile) && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {contact.mobile ?? contact.phone}
                  </p>
                )}
              </div>

              <p className="mt-3 text-right text-xs text-slate-400">
                {formatDateRelative(contact.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <CreateContactModal
          companies={companies}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createContact.mutate(data)}
          isLoading={createContact.isPending}
        />
      )}
    </div>
  )
}

function CreateContactModal({
  companies,
  onClose,
  onSubmit,
  isLoading,
}: {
  companies: Pick<Company, 'id' | 'name'>[]
  onClose: () => void
  onSubmit: (data: Partial<Contact>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    role: 'referente' as ContactRole,
    job_title: '',
    email: '',
    phone: '',
    mobile: '',
    company_id: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      company_id: form.company_id || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nuovo contatto</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
              <input
                value={form.first_name}
                onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cognome *</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ruolo</label>
              <select
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value as ContactRole }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(roleLabels).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Titolo</label>
              <input
                value={form.job_title}
                onChange={(e) => setForm(f => ({ ...f, job_title: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cellulare</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Azienda</label>
              <select
                value={form.company_id}
                onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Nessuna azienda</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annulla
            </button>
            <button type="submit" disabled={isLoading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              {isLoading ? 'Salvataggio...' : 'Crea contatto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
