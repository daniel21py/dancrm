import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Plus, Search, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Company, CompanyStatus, CompanyType } from '@/types/database'
import { formatDateRelative } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const statusConfig: Record<CompanyStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  prospect: { label: 'Prospect', variant: 'secondary' },
  lead: { label: 'Lead', variant: 'default' },
  active: { label: 'Attivo', variant: 'success' },
  inactive: { label: 'Inattivo', variant: 'warning' },
  churned: { label: 'Perso', variant: 'destructive' },
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
  const navigate = useNavigate()
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
          <h1 className="text-xl font-semibold tracking-tight">Clienti</h1>
          <p className="text-sm text-muted-foreground">{companies.length} aziende</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuovo cliente
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, citta..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
          className="w-44"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nessun cliente"
          description={search || statusFilter ? 'Nessun risultato per i filtri selezionati.' : 'Crea il tuo primo cliente per iniziare.'}
          action={!search && !statusFilter ? { label: 'Nuovo cliente', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Azienda</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Stato</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Contatto</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Citta</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Aggiunto</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company, i) => (
                <motion.tr
                  key={company.id}
                  className="group border-b border-border last:border-0 transition-colors hover:bg-accent/50 cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate({ to: '/clients/$id', params: { id: company.id } })}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{typeLabels[company.type]}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusConfig[company.status].variant}>
                      {statusConfig[company.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {company.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{company.phone}</span>}
                      {company.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{company.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {company.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{company.city}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {formatDateRelative(company.created_at)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <CreateCompanyForm
          onSubmit={(data) => createCompany.mutate(data)}
          isLoading={createCompany.isPending}
        />
      </Dialog>
    </div>
  )
}

function CreateCompanyForm({
  onSubmit,
  isLoading,
}: {
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
    onSubmit({ ...form, status: 'prospect' })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nuovo cliente</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nome azienda</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as CompanyType }))}>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Settore</Label>
            <Input value={form.sector} onChange={(e) => setForm(f => ({ ...f, sector: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefono</Label>
            <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Citta</Label>
            <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>P.IVA</Label>
            <Input value={form.piva} onChange={(e) => setForm(f => ({ ...f, piva: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Note</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvataggio...' : 'Crea cliente'}
          </Button>
        </div>
      </form>
    </>
  )
}
