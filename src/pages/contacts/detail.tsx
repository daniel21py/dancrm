import { useState } from 'react'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, Mail, Phone, Smartphone, Linkedin,
  Building2, Pencil, Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Contact, ContactRole, Company, Activity, Deal, PipelineStage } from '@/types/database'
import { formatCurrency, formatDateRelative, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { ActivityTimeline } from '@/components/activity-timeline'
import { ActivityComposer } from '@/components/activity-composer'

const roleConfig: Record<ContactRole, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
  decisore: { label: 'Decisore', variant: 'default' },
  operativo: { label: 'Operativo', variant: 'secondary' },
  referente: { label: 'Referente', variant: 'success' },
  altro: { label: 'Altro', variant: 'secondary' },
}

const roleLabels: Record<ContactRole, string> = {
  decisore: 'Decisore', operativo: 'Operativo', referente: 'Referente', altro: 'Altro',
}

export function ContactDetailPage() {
  const { id } = useParams({ from: '/authenticated/contacts/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { member } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, company:companies(id, name, city)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Contact & { company: Pick<Company, 'id' | 'name' | 'city'> | null }
    },
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['deals', 'by-contact', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .eq('company_id', contact?.company_id ?? '')
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as (Deal & { stage: PipelineStage | null })[]
    },
    enabled: !!contact?.company_id,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'by-contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', id)
        .order('occurred_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Activity[]
    },
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      return (data ?? []) as Pick<Company, 'id' | 'name'>[]
    },
  })

  const updateContact = useMutation({
    mutationFn: async (updates: Partial<Contact>) => {
      const { error } = await supabase.from('contacts').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setIsEditing(false)
      toast.success('Contatto aggiornato')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  })

  const deleteContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contatto eliminato')
      navigate({ to: '/contacts' })
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  })

  if (isLoading || !contact) {
    return (
      <div>
        <div className="mb-6 h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="mb-6 flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <SkeletonCard lines={4} />
          <div className="space-y-4">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
          </div>
        </div>
      </div>
    )
  }

  const fullName = `${contact.first_name} ${contact.last_name}`

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/contacts" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Contatti
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
        <Avatar name={fullName} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{fullName}</h1>
            <Badge variant={roleConfig[contact.role].variant}>
              {roleConfig[contact.role].label}
            </Badge>
            {contact.is_primary && <Badge variant="default">Primario</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {contact.job_title && `${contact.job_title}`}
            {contact.job_title && contact.company && ' · '}
            {contact.company && (
              <Link to="/clients/$id" params={{ id: contact.company.id }} className="hover:underline">
                {contact.company.name}
              </Link>
            )}
            {contact.company?.city && `, ${contact.company.city}`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {member && (
            <ActivityComposer
              contactId={contact.id}
              companyId={contact.company_id ?? undefined}
              tenantId={member.tenant_id}
            />
          )}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attivita</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                activities={activities}
                emptyLabel="Nessuna attivita. Usa il composer per registrare la prima interazione."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contatti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.mobile && (
                <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Smartphone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{contact.mobile}</span>
                </a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">LinkedIn</span>
                </a>
              )}
              {!contact.email && !contact.phone && !contact.mobile && (
                <p className="text-xs text-muted-foreground">Nessun recapito.</p>
              )}
            </CardContent>
          </Card>

          {contact.company && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Azienda</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to="/clients/$id"
                  params={{ id: contact.company.id }}
                  className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:border-muted-foreground/25"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{contact.company.name}</p>
                    {contact.company.city && <p className="text-2xs text-muted-foreground">{contact.company.city}</p>}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {deals.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Deal azienda</CardTitle>
                <span className="text-2xs text-muted-foreground">{deals.length}</span>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.map(deal => (
                  <Link
                    key={deal.id}
                    to="/deals/$id"
                    params={{ id: deal.id }}
                    className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:border-muted-foreground/25"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{deal.title}</p>
                      {deal.stage && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deal.stage.color }} />
                          <p className="text-2xs text-muted-foreground">{deal.stage.name}</p>
                        </div>
                      )}
                    </div>
                    {deal.value != null && (
                      <p className="text-xs font-semibold text-primary">{formatCurrency(deal.value)}</p>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {contact.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>Creato {formatDateRelative(contact.created_at)}</p>
              <p>Aggiornato {formatDateRelative(contact.updated_at)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)}>
        <DialogHeader>
          <DialogTitle>Modifica contatto</DialogTitle>
        </DialogHeader>
        <EditContactForm
          contact={contact}
          companies={companies}
          onSubmit={(data) => updateContact.mutate(data)}
          isLoading={updateContact.isPending}
        />
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogHeader>
          <DialogTitle>Eliminare questo contatto?</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Questa azione eliminera {fullName} e tutte le attivita associate. Non puo essere annullata.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Annulla</Button>
          <Button variant="destructive" onClick={() => deleteContact.mutate()} disabled={deleteContact.isPending}>
            {deleteContact.isPending ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function EditContactForm({
  contact, companies, onSubmit, isLoading,
}: {
  contact: Contact & { company: Pick<Company, 'id' | 'name' | 'city'> | null }
  companies: Pick<Company, 'id' | 'name'>[]
  onSubmit: (data: Partial<Contact>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    first_name: contact.first_name,
    last_name: contact.last_name,
    role: contact.role,
    job_title: contact.job_title ?? '',
    company_id: contact.company_id ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    mobile: contact.mobile ?? '',
    linkedin_url: contact.linkedin_url ?? '',
    notes: contact.notes ?? '',
    is_primary: contact.is_primary,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
      job_title: form.job_title || null,
      company_id: form.company_id || null,
      email: form.email || null,
      phone: form.phone || null,
      mobile: form.mobile || null,
      linkedin_url: form.linkedin_url || null,
      notes: form.notes || null,
      is_primary: form.is_primary,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Cognome</Label>
          <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Ruolo</Label>
          <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as ContactRole }))}>
            {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Qualifica</Label>
          <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="es. CEO, Sales Manager..." />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Azienda</Label>
          <Select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}>
            <option value="">Nessuna</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefono</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Mobile</Label>
          <Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>LinkedIn URL</Label>
          <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Note</Label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className={cn(
              'flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="is_primary"
            checked={form.is_primary}
            onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
            className="rounded border border-border"
          />
          <label htmlFor="is_primary" className="text-sm font-medium">Contatto primario</label>
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
