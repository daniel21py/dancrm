import { useState } from 'react'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, Calendar, TrendingUp,
  Pencil, Trash2, Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Deal, Company, PipelineStage, Activity } from '@/types/database'
import { formatCurrency, formatDate, formatDateRelative, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ActivityTimeline } from '@/components/activity-timeline'
import { ActivityComposer } from '@/components/activity-composer'

type DealDetail = Deal & {
  company: Pick<Company, 'id' | 'name'> | null
  stage: PipelineStage | null
}

export function DealDetailPage() {
  const { id } = useParams({ from: '/authenticated/deals/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { member } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, company:companies(id, name), stage:pipeline_stages(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as DealDetail
    },
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipeline_stages').select('*').order('position')
      if (error) throw error
      return data as PipelineStage[]
    },
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      return (data ?? []) as Pick<Company, 'id' | 'name'>[]
    },
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'by-deal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', id)
        .order('occurred_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Activity[]
    },
  })

  const updateDeal = useMutation({
    mutationFn: async (updates: Partial<Deal>) => {
      const { error } = await supabase.from('deals').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setIsEditing(false)
      toast.success('Deal aggiornato')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  })

  const deleteDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('deals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      navigate({ to: '/deals' })
      toast.success('Deal eliminato')
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  })

  const changeStage = useMutation({
    mutationFn: async (stage_id: string) => {
      const { error } = await supabase.from('deals').update({ stage_id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      toast.success('Stage aggiornato')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  })

  if (isLoading || !deal) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/deals" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Pipeline
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

      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">{deal.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {deal.company && (
            <Link
              to="/clients/$id"
              params={{ id: deal.company.id }}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5" />
              {deal.company.name}
            </Link>
          )}
          {deal.value != null && (
            <span className="flex items-center gap-1 font-semibold text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(deal.value)}
            </span>
          )}
        </div>
      </div>

      {/* Stage pipeline selector */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs">Stage pipeline</Label>
            {deal.probability != null && (
              <span className="text-xs text-muted-foreground">Probabilita: {deal.probability}%</span>
            )}
          </div>
          <div className="flex gap-1">
            {stages.map((stage) => {
              const isActive = stage.id === deal.stage_id
              return (
                <button
                  key={stage.id}
                  onClick={() => !isActive && changeStage.mutate(stage.id)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
                    isActive
                      ? 'text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={isActive ? {
                    backgroundColor: `${stage.color}20`,
                    boxShadow: `inset 0 0 0 1px ${stage.color}50`,
                  } : {}}
                >
                  {stage.name}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {member && (
            <ActivityComposer
              dealId={deal.id}
              companyId={deal.company_id ?? undefined}
              tenantId={member.tenant_id}
            />
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attivita</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} emptyLabel="Nessuna attivita registrata per questo deal." />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dettagli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {deal.value != null && (
                <Row icon={TrendingUp} label="Valore" value={formatCurrency(deal.value)} valueClass="font-semibold text-primary" />
              )}
              {deal.probability != null && (
                <Row icon={Target} label="Probabilita" value={`${deal.probability}%`} />
              )}
              {deal.expected_close && (
                <Row icon={Calendar} label="Chiusura prevista" value={formatDate(deal.expected_close)} />
              )}
              {deal.actual_close && (
                <Row icon={Calendar} label="Chiusura effettiva" value={formatDate(deal.actual_close)} />
              )}
              {deal.lost_reason && (
                <div className="pt-1">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">Motivo perdita</p>
                  <p className="mt-0.5 text-xs">{deal.lost_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {deal.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">{deal.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>Creato {formatDateRelative(deal.created_at)}</p>
              <p>Aggiornato {formatDateRelative(deal.updated_at)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)}>
        <DialogHeader>
          <DialogTitle>Modifica deal</DialogTitle>
        </DialogHeader>
        <EditDealForm
          deal={deal}
          stages={stages}
          companies={companies}
          onSubmit={(data) => updateDeal.mutate(data)}
          isLoading={updateDeal.isPending}
        />
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogHeader>
          <DialogTitle>Eliminare questo deal?</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Questa azione eliminera il deal {deal.title} e tutte le attivita associate. Non puo essere annullata.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Annulla</Button>
          <Button variant="destructive" onClick={() => deleteDeal.mutate()} disabled={deleteDeal.isPending}>
            {deleteDeal.isPending ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function Row({ icon: Icon, label, value, valueClass }: { icon: typeof Calendar; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn('text-xs', valueClass)}>{value}</span>
    </div>
  )
}

function EditDealForm({
  deal, stages, companies, onSubmit, isLoading,
}: {
  deal: DealDetail
  stages: PipelineStage[]
  companies: Pick<Company, 'id' | 'name'>[]
  onSubmit: (data: Partial<Deal>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    title: deal.title,
    company_id: deal.company_id ?? '',
    stage_id: deal.stage_id ?? '',
    value: deal.value?.toString() ?? '',
    probability: deal.probability?.toString() ?? '50',
    expected_close: deal.expected_close ?? '',
    actual_close: deal.actual_close ?? '',
    lost_reason: deal.lost_reason ?? '',
    notes: deal.notes ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title: form.title,
      company_id: form.company_id || null,
      stage_id: form.stage_id || null,
      value: form.value ? parseFloat(form.value) : null,
      probability: parseInt(form.probability),
      expected_close: form.expected_close || null,
      actual_close: form.actual_close || null,
      lost_reason: form.lost_reason || null,
      notes: form.notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Titolo</Label>
          <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Azienda</Label>
          <Select value={form.company_id} onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}>
            <option value="">Nessuna</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select value={form.stage_id} onChange={(e) => setForm(f => ({ ...f, stage_id: e.target.value }))}>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valore (EUR)</Label>
          <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Probabilita %</Label>
          <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm(f => ({ ...f, probability: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Chiusura prevista</Label>
          <Input type="date" value={form.expected_close} onChange={(e) => setForm(f => ({ ...f, expected_close: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Chiusura effettiva</Label>
          <Input type="date" value={form.actual_close} onChange={(e) => setForm(f => ({ ...f, actual_close: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Motivo perdita</Label>
          <Input value={form.lost_reason} onChange={(e) => setForm(f => ({ ...f, lost_reason: e.target.value }))} placeholder="Solo se deal perso" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Note</Label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
