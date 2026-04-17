import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Building2, Kanban, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Deal, PipelineStage, Company } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type DealWithCompany = Deal & { company: Pick<Company, 'id' | 'name'> | null }

export function DealsPage() {
  const queryClient = useQueryClient()
  const [activeDeal, setActiveDeal] = useState<DealWithCompany | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipeline_stages').select('*').order('position')
      if (error) throw error
      return data as PipelineStage[]
    },
  })

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DealWithCompany[]
    },
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      return (data ?? []) as Pick<Company, 'id' | 'name'>[]
    },
  })

  const moveDeal = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { error } = await supabase.from('deals').update({ stage_id: stageId }).eq('id', dealId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const createDeal = useMutation({
    mutationFn: async (deal: Partial<Deal>) => {
      const { data, error } = await supabase.from('deals').insert(deal).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowForm(false)
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id)
    if (deal) setActiveDeal(deal)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return
    const dealId = active.id as string
    const targetStageId = over.id as string
    const deal = deals.find(d => d.id === dealId)
    if (deal && deal.stage_id !== targetStageId && stages.some(s => s.id === targetStageId)) {
      moveDeal.mutate({ dealId, stageId: targetStageId })
    }
  }

  if (stagesLoading || dealsLoading) return <Spinner />

  if (stages.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Pipeline</h1>
        <EmptyState
          icon={Kanban}
          title="Nessuno stage configurato"
          description="Configura gli stage della pipeline nelle Impostazioni per iniziare a tracciare i deal."
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deal</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuovo deal
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
          {stages.map((stage) => {
            const stageDeals = deals.filter(d => d.stage_id === stage.id)
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
            return <StageColumn key={stage.id} stage={stage} deals={stageDeals} totalValue={stageValue} />
          })}
        </div>
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} isDragOverlay />}
        </DragOverlay>
      </DndContext>

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Nuovo deal</DialogTitle>
        </DialogHeader>
        <CreateDealForm
          stages={stages}
          companies={companies}
          onSubmit={(data) => createDeal.mutate(data)}
          isLoading={createDeal.isPending}
        />
      </Dialog>
    </div>
  )
}

function StageColumn({ stage, deals, totalValue }: { stage: PipelineStage; deals: DealWithCompany[]; totalValue: number }) {
  const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'stage' } })

  return (
    <div ref={setNodeRef} className="flex w-[280px] flex-shrink-0 flex-col rounded-xl border border-border bg-card/50">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-xs font-semibold">{stage.name}</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <span className="text-2xs text-muted-foreground">{formatCurrency(totalValue)}</span>
      </div>

      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-1.5 px-1.5 pb-1.5" style={{ minHeight: 80 }}>
          <AnimatePresence>
            {deals.map((deal) => (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <DealCard deal={deal} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </div>
  )
}

function DealCard({ deal, isDragOverlay }: { deal: DealWithCompany; isDragOverlay?: boolean }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      className="group relative cursor-grab rounded-lg border border-border bg-card p-3 transition-all hover:border-muted-foreground/25 active:cursor-grabbing"
    >
      {!isDragOverlay && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            navigate({ to: '/deals/$id', params: { id: deal.id } })
          }}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          title="Apri dettaglio"
        >
          <ExternalLink className="h-3 w-3" />
        </button>
      )}
      <p className="mb-1 pr-5 text-sm font-medium">{deal.title}</p>
      {deal.company && (
        <p className="mb-1.5 flex items-center gap-1 text-2xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {deal.company.name}
        </p>
      )}
      <div className="flex items-center justify-between">
        {deal.value != null && (
          <p className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</p>
        )}
        {deal.expected_close && (
          <p className="text-2xs text-muted-foreground">{deal.expected_close}</p>
        )}
      </div>
    </div>
  )
}

function CreateDealForm({
  stages, companies, onSubmit, isLoading,
}: {
  stages: PipelineStage[]
  companies: Pick<Company, 'id' | 'name'>[]
  onSubmit: (data: Partial<Deal>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    title: '', company_id: '', stage_id: stages[0]?.id ?? '',
    value: '', probability: '50', expected_close: '',
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
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Titolo</Label>
          <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus placeholder="es. Contratto spedizioni Q2" />
        </div>
        <div className="space-y-1.5">
          <Label>Azienda</Label>
          <Select value={form.company_id} onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}>
            <option value="">Seleziona...</option>
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
          <Label>Chiusura prevista</Label>
          <Input type="date" value={form.expected_close} onChange={(e) => setForm(f => ({ ...f, expected_close: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvataggio...' : 'Crea deal'}
        </Button>
      </div>
    </form>
  )
}
