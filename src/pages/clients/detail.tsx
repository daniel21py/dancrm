import { useState } from 'react'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, Globe, Mail, Phone, MapPin,
  Pencil, Trash2, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Company, CompanyStatus, CompanyType, Contact, Deal, Activity, PipelineStage } from '@/types/database'
import { formatCurrency, formatDateRelative, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { ActivityTimeline } from '@/components/activity-timeline'
import { ActivityComposer } from '@/components/activity-composer'

const statusConfig: Record<CompanyStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  prospect: { label: 'Prospect', variant: 'secondary' },
  lead: { label: 'Lead', variant: 'default' },
  active: { label: 'Attivo', variant: 'success' },
  inactive: { label: 'Inattivo', variant: 'warning' },
  churned: { label: 'Perso', variant: 'destructive' },
}

const typeLabels: Record<CompanyType, string> = {
  prospect: 'Prospect', cliente: 'Cliente', fornitore: 'Fornitore', partner: 'Partner', altro: 'Altro',
}

export function ClientDetailPage() {
  const { id } = useParams({ from: '/authenticated/clients/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { member } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').eq('id', id).single()
      if (error) throw error
      return data as Company
    },
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', 'by-company', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false })
      if (error) throw error
      return data as Contact[]
    },
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['deals', 'by-company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .eq('company_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Deal & { stage: PipelineStage | null })[]
    },
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'by-company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('company_id', id)
        .order('occurred_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Activity[]
    },
  })

  const updateCompany = useMutation({
    mutationFn: async (updates: Partial<Company>) => {
      const { error } = await supabase.from('companies').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setIsEditing(false)
      toast.success('Cliente aggiornato')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  })

  const deleteCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('companies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      navigate({ to: '/clients' })
      toast.success('Cliente eliminato')
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  })

  if (isLoading || !company) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/clients" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Clienti
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Modifica
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
            <Badge variant={statusConfig[company.status].variant}>
              {statusConfig[company.status].label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {typeLabels[company.type]}
            {company.sector && ` · ${company.sector}`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {member && (
            <ActivityComposer
              companyId={company.id}
              tenantId={member.tenant_id}
            />
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attivita</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} emptyLabel="Nessuna attivita registrata. Usa il composer sopra per iniziare." />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {company.website && (
                <InfoLine icon={Globe} value={company.website} href={company.website.startsWith('http') ? company.website : `https://${company.website}`} />
              )}
              {company.email && <InfoLine icon={Mail} value={company.email} href={`mailto:${company.email}`} />}
              {company.phone && <InfoLine icon={Phone} value={company.phone} href={`tel:${company.phone}`} />}
              {(company.city || company.address) && (
                <InfoLine
                  icon={MapPin}
                  value={[company.address, company.city, company.province].filter(Boolean).join(', ')}
                />
              )}
              {company.piva && <InfoLineText label="P.IVA" value={company.piva} />}
              {company.employee_count != null && <InfoLineText label="Dipendenti" value={String(company.employee_count)} />}
              {company.annual_revenue != null && <InfoLineText label="Fatturato annuo" value={formatCurrency(company.annual_revenue)} />}
              {!company.website && !company.email && !company.phone && !company.city && (
                <p className="text-xs text-muted-foreground">Nessuna informazione aggiuntiva.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Contatti</CardTitle>
              <span className="text-2xs text-muted-foreground">{contacts.length}</span>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <Link to="/contacts" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi contatto
                </Link>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2.5">
                      <Avatar name={`${contact.first_name} ${contact.last_name}`} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.job_title && (
                          <p className="truncate text-2xs text-muted-foreground">{contact.job_title}</p>
                        )}
                      </div>
                      {contact.is_primary && <Badge variant="default">Primario</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Deal</CardTitle>
              <span className="text-2xs text-muted-foreground">{deals.length}</span>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <Link to="/deals" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Crea deal
                </Link>
              ) : (
                <div className="space-y-2">
                  {deals.map((deal) => (
                    <Link
                      key={deal.id}
                      to="/deals/$id"
                      params={{ id: deal.id }}
                      className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:border-muted-foreground/25"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{deal.title}</p>
                        <div className="flex items-center gap-1.5">
                          {deal.stage && (
                            <>
                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deal.stage.color }} />
                              <p className="text-2xs text-muted-foreground">{deal.stage.name}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {deal.value != null && (
                        <p className="text-xs font-semibold text-primary">{formatCurrency(deal.value)}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>Creato {formatDateRelative(company.created_at)}</p>
              <p>Aggiornato {formatDateRelative(company.updated_at)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)}>
        <DialogHeader>
          <DialogTitle>Modifica cliente</DialogTitle>
        </DialogHeader>
        <EditCompanyForm
          company={company}
          onSubmit={(data) => updateCompany.mutate(data)}
          isLoading={updateCompany.isPending}
        />
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogHeader>
          <DialogTitle>Eliminare questo cliente?</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Questa azione eliminera l'azienda {company.name} e scollega tutti i contatti, deal e attivita associati. Non puo essere annullata.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Annulla</Button>
          <Button variant="destructive" onClick={() => deleteCompany.mutate()} disabled={deleteCompany.isPending}>
            {deleteCompany.isPending ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function InfoLine({ icon: Icon, value, href }: { icon: typeof Globe; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  )
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : content
}

function InfoLineText({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

function EditCompanyForm({
  company, onSubmit, isLoading,
}: {
  company: Company
  onSubmit: (data: Partial<Company>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    name: company.name,
    type: company.type,
    status: company.status,
    email: company.email ?? '',
    phone: company.phone ?? '',
    website: company.website ?? '',
    city: company.city ?? '',
    address: company.address ?? '',
    piva: company.piva ?? '',
    sector: company.sector ?? '',
    notes: company.notes ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: form.name,
      type: form.type,
      status: form.status,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      city: form.city || null,
      address: form.address || null,
      piva: form.piva || null,
      sector: form.sector || null,
      notes: form.notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Nome azienda</Label>
          <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as CompanyType }))}>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Stato</Label>
          <Select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as CompanyStatus }))}>
            {Object.entries(statusConfig).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Settore</Label>
          <Input value={form.sector} onChange={(e) => setForm(f => ({ ...f, sector: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefono</Label>
          <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Indirizzo</Label>
          <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
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
            rows={3}
            className={cn(
              'flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>
    </form>
  )
}
