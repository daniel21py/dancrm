import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Plus, GripVertical, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Deal, PipelineStage, Company } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

type DealWithCompany = Deal & { company: Pick<Company, 'id' | 'name'> | null }

export function DealsPage() {
  const queryClient = useQueryClient()
  const [activeDeal, setActiveDeal] = useState<DealWithCompany | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('position')
      if (error) throw error
      return data as PipelineStage[]
    },
  })

  const { data: deals = [], isLoading } = useQuery({
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

  const dealsByStage = (stageId: string) => deals.filter(d => d.stage_id === stageId)

  if (stages.length === 0 && !isLoading) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Pipeline</h1>
        <div className="mt-8 rounded-xl border bg-white p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Nessuno stage configurato</h3>
          <p className="text-sm text-slate-500">
            Configura gli stage della pipeline nelle Impostazioni per iniziare a tracciare i deal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">{deals.length} deal totali</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuovo deal
        </button>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = dealsByStage(stage.id)
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)

            return (
              <StageColumn key={stage.id} stage={stage} deals={stageDeals} totalValue={stageValue} />
            )
          })}
        </div>

        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} isDragOverlay />}
        </DragOverlay>
      </DndContext>

      {/* Create modal */}
      {showForm && (
        <CreateDealModal
          stages={stages}
          companies={companies}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createDeal.mutate(data)}
          isLoading={createDeal.isPending}
        />
      )}
    </div>
  )
}

function StageColumn({ stage, deals, totalValue }: { stage: PipelineStage; deals: DealWithCompany[]; totalValue: number }) {
  const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'stage' } })

  return (
    <div
      ref={setNodeRef}
      className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-slate-100/50"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
            {deals.length}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500">{formatCurrency(totalValue)}</span>
      </div>

      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 px-2 pb-2" style={{ minHeight: 100 }}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function DealCard({ deal, isDragOverlay }: { deal: DealWithCompany; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      className="cursor-grab rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="text-sm font-medium text-slate-900">{deal.title}</p>
        <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-300" />
      </div>
      {deal.company && (
        <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
          <Building2 className="h-3 w-3" />
          {deal.company.name}
        </p>
      )}
      {deal.value != null && (
        <p className="text-sm font-semibold text-slate-700">{formatCurrency(deal.value)}</p>
      )}
      {deal.expected_close && (
        <p className="mt-1 text-xs text-slate-400">Chiusura: {deal.expected_close}</p>
      )}
    </div>
  )
}

function CreateDealModal({
  stages,
  companies,
  onClose,
  onSubmit,
  isLoading,
}: {
  stages: PipelineStage[]
  companies: Pick<Company, 'id' | 'name'>[]
  onClose: () => void
  onSubmit: (data: Partial<Deal>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    title: '',
    company_id: '',
    stage_id: stages[0]?.id ?? '',
    value: '',
    probability: '50',
    expected_close: '',
    notes: '',
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
      notes: form.notes || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nuovo deal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Titolo *</label>
              <input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="es. Contratto spedizioni Q2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Azienda</label>
              <select
                value={form.company_id}
                onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Seleziona...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Stage</label>
              <select
                value={form.stage_id}
                onChange={(e) => setForm(f => ({ ...f, stage_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Valore (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Probabilita %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => setForm(f => ({ ...f, probability: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Data chiusura prevista</label>
              <input
                type="date"
                value={form.expected_close}
                onChange={(e) => setForm(f => ({ ...f, expected_close: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annulla
            </button>
            <button type="submit" disabled={isLoading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              {isLoading ? 'Salvataggio...' : 'Crea deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
