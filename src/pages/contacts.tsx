import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Search, Users, Phone, Mail, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Contact, ContactRole, Company } from '@/types/database'
import { formatDateRelative } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

const roleConfig: Record<ContactRole, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
  decisore: { label: 'Decisore', variant: 'default' },
  operativo: { label: 'Operativo', variant: 'secondary' },
  referente: { label: 'Referente', variant: 'success' },
  altro: { label: 'Altro', variant: 'secondary' },
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }
const item = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

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
          <h1 className="text-xl font-semibold tracking-tight">Contatti</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contatti</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuovo contatto
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, email..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun contatto"
          description="Aggiungi il tuo primo contatto per iniziare."
          action={{ label: 'Nuovo contatto', onClick: () => setShowForm(true) }}
        />
      ) : (
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {contacts.map((contact) => (
            <motion.div key={contact.id} variants={item}>
              <Card className="group cursor-pointer p-4 transition-colors hover:border-muted-foreground/25">
                <div className="mb-3 flex items-start gap-3">
                  <Avatar name={`${contact.first_name} ${contact.last_name}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.job_title && (
                      <p className="truncate text-xs text-muted-foreground">{contact.job_title}</p>
                    )}
                  </div>
                  <Badge variant={roleConfig[contact.role].variant}>
                    {roleConfig[contact.role].label}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {contact.company && (
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{contact.company.name}</span>
                    </p>
                  )}
                  {contact.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </p>
                  )}
                  {(contact.mobile ?? contact.phone) && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      {contact.mobile ?? contact.phone}
                    </p>
                  )}
                </div>

                <p className="mt-3 text-right text-2xs text-muted-foreground">
                  {formatDateRelative(contact.created_at)}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Nuovo contatto</DialogTitle>
        </DialogHeader>
        <CreateContactForm
          companies={companies}
          onSubmit={(data) => createContact.mutate(data)}
          isLoading={createContact.isPending}
        />
      </Dialog>
    </div>
  )
}

function CreateContactForm({
  companies,
  onSubmit,
  isLoading,
}: {
  companies: Pick<Company, 'id' | 'name'>[]
  onSubmit: (data: Partial<Contact>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', role: 'referente' as ContactRole,
    job_title: '', email: '', phone: '', mobile: '', company_id: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...form, company_id: form.company_id || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Cognome</Label>
          <Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Ruolo</Label>
          <Select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as ContactRole }))}>
            {Object.entries(roleConfig).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Titolo</Label>
          <Input value={form.job_title} onChange={(e) => setForm(f => ({ ...f, job_title: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Cellulare</Label>
          <Input value={form.mobile} onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Azienda</Label>
          <Select value={form.company_id} onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}>
            <option value="">Nessuna azienda</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvataggio...' : 'Crea contatto'}
        </Button>
      </div>
    </form>
  )
}
