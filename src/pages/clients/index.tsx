import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Building2, MoreHorizontal, Phone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Company, CompanyStatus, CompanyType } from '@/types/database'
import { cn, formatDateRelative } from '@/lib/utils'

const statusLabels: Record<CompanyStatus, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'bg-slate-100 text-slate-700' },
  lead: { label: 'Lead', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Attivo', className: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inattivo', className: 'bg-amber-100 text-amber-700' },
  churned: { label: 'Perso', className: 'bg-red-100 text-red-700' },
}

const typeLabels: Record<CompanyType, string> = {
  prospect: 'Prospect',
  cliente: 'Cliente',
  fornitore: 'Fornitore',
  partner: 'Partner',
  altro: 'Altro',
}

export function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('')
  const [showForm, setShowForm] = useState(false)

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`)
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data as Company[]
    },
  })

  const createCompany = useMutation({
    mutationFn: async (company: Partial<Company>) => {
      const { data, error } = await supabase.from('companies').insert(company).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowForm(false)
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clienti</h1>
          <p className="text-sm text-slate-500">{companies.length} aziende</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuovo cliente
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, citta..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-1 text-lg font-semibold text-slate-900">Nessun cliente</h3>
          <p className="text-sm text-slate-500">
            {search || statusFilter ? 'Nessun risultato per i filtri selezionati.' : 'Crea il tuo primo cliente per iniziare.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Azienda</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Stato</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Contatto</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Citta</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Aggiunto</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Building2 className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="font-medium text-slate-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{typeLabels[company.type]}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusLabels[company.status].className)}>
                      {statusLabels[company.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-slate-500">
                      {company.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{company.phone}</span>}
                      {company.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{company.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {company.city && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{company.city}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDateRelative(company.created_at)}</td>
                  <td className="px-4 py-3">
                    <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <CreateCompanyModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createCompany.mutate(data)}
          isLoading={createCompany.isPending}
        />
      )}
    </div>
  )
}

function CreateCompanyModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void
  onSubmit: (data: Partial<Company>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'prospect' as CompanyType,
    email: '',
    phone: '',
    city: '',
    piva: '',
    sector: '',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      status: 'prospect',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nuovo cliente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome azienda *</label>
              <input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value as CompanyType }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Settore</label>
              <input
                value={form.sector}
                onChange={(e) => setForm(f => ({ ...f, sector: e.target.value }))}
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Citta</label>
              <input
                value={form.city}
                onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">P.IVA</label>
              <input
                value={form.piva}
                onChange={(e) => setForm(f => ({ ...f, piva: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Salvataggio...' : 'Crea cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
