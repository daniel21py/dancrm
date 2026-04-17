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
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Building2, Kanban, ExternalLink, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
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
import { useAuthStore } from '@/stores/auth'

type DealWithCompany = Deal & {
  company: Pick<Company, 'id' | 'name'> | null
}

export function DealsPage() {
  const queryClient = useQueryClient()
  const { member } = useAuthStore()
  const [activeDeal, setActiveDeal] = useState<DealWithCompany | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
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
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')
      return (data ?? []) as Pick<Company, 'id' | 'name'>[]
    },
  })

  const moveDeal = useMutation({
    mutationFn: async ({
      dealId,
      stageId,
    }: {
      dealId: string
      stageId: string
    }) => {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId })
        .eq('id', dealId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const createDeal = useMutation({
    mutationFn: async (deal: Partial<Deal>) => {
      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, tenant_id: member!.tenant_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowForm(false)
      toast.success('Deal creato')
    },
    onError: () => toast.error('Errore durante la creazione'),
  })

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id)
    if (deal) setActiveDeal(deal)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return
    const dealId = active.id as string
    const targetStageId = over.id as string
    const deal = deals.find((d) => d.id === dealId)
    if (
      deal &&
      deal.stage_id !== targetStageId &&
      stages.some((s) => s.id === targetStageId)
    ) {
      moveDeal.mutate({ dealId, stageId: targetStageId })
    }
  }

  if (stagesLoading || dealsLoading) return <Spinner />

  if (stages.length === 0) {
    return (
      <div>
        <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">
          Pipeline
        </h1>
        <EmptyState
          icon={Kanban}
          title="Nessuno stage configurato"
          description="Configura gli stage della pipeline nelle Impostazioni per iniziare a tracciare i deal."
        />
      </div>
    )
  }

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Pipeline · Live
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Deal in corso
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="tabular text-foreground">{deals.length}</span> deal ·{' '}
            <span className="tabular text-primary">{formatCurrency(totalValue)}</span>{' '}
            valore totale
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuovo deal
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-3 pb-4"
          style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
        >
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage_id === stage.id)
            const stageValue = stageDeals.reduce(
              (sum, d) => sum + (d.value ?? 0),
              0,
            )
            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={stageDeals}
                totalValue={stageValue}
              />
            )
          })}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}>
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

function StageColumn({
  stage,
  deals,
  totalValue,
}: {
  stage: PipelineStage
  deals: DealWithCompany[]
  totalValue: number
}) {
  const { setNodeRef, isOver } = useSortable({
    id: stage.id,
    data: { type: 'stage' },
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex min-w-0 flex-col rounded-xl border bg-card/40 backdrop-blur transition-colors',
        isOver
          ? 'border-primary/50 bg-primary/[0.04]'
          : 'border-border/60',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full ring-2 ring-offset-2 ring-offset-card"
            style={{
              backgroundColor: stage.color,
              boxShadow: `0 0 8px ${stage.color}`,
            }}
          />
          <span className="text-xs font-semibold">{stage.name}</span>
          <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tabular">
          {formatCurrency(totalValue)}
        </span>
      </div>

      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="flex-1 space-y-1.5 p-1.5"
          style={{ minHeight: 120 }}
        >
          <AnimatePresence>
            {deals.map((deal) => (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <DealCard deal={deal} />
              </motion.div>
            ))}
          </AnimatePresence>
          {deals.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/50">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Drop here
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function DealCard({
  deal,
  isDragOverlay,
}: {
  deal: DealWithCompany
  isDragOverlay?: boolean
}) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      className={[
        'group relative cursor-grab rounded-lg border bg-card p-3 transition-all active:cursor-grabbing',
        isDragOverlay
          ? 'border-primary/60 shadow-lime-glow rotate-1'
          : 'border-border/60 hover:border-primary/35 hover:shadow-card-hover',
      ].filter(Boolean).join(' ')}
    >
      <GripVertical className="absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />

      {!isDragOverlay && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            navigate({ to: '/deals/$id', params: { id: deal.id } })
          }}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-primary group-hover:opacity-100"
          title="Apri dettaglio"
        >
          <ExternalLink className="h-3 w-3" />
        </button>
      )}

      <p className="mb-1 pl-1 pr-5 text-sm font-medium leading-tight">
        {deal.title}
      </p>
      {deal.company && (
        <p className="mb-2 flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {deal.company.name}
        </p>
      )}
      <div className="flex items-center justify-between pl-1">
        {deal.value != null && (
          <p className="font-display text-sm font-semibold text-primary tabular">
            {formatCurrency(deal.value)}
          </p>
        )}
        {deal.expected_close && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {deal.expected_close}
          </p>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-primary via-primary to-transparent transition-transform duration-300 group-hover:scale-x-100"
      />
    </div>
  )
}

function CreateDealForm({
  stages,
  companies,
  onSubmit,
  isLoading,
}: {
  stages: PipelineStage[]
  companies: Pick<Company, 'id' | 'name'>[]
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
          <Input
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            required
            autoFocus
            placeholder="es. Contratto spedizioni Q2"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Azienda</Label>
          <Select
            value={form.company_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, company_id: e.target.value }))
            }
          >
            <option value="">Seleziona...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select
            value={form.stage_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, stage_id: e.target.value }))
            }
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valore (EUR)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.value}
            onChange={(e) =>
              setForm((f) => ({ ...f, value: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Chiusura prevista</Label>
          <Input
            type="date"
            value={form.expected_close}
            onChange={(e) =>
              setForm((f) => ({ ...f, expected_close: e.target.value }))
            }
          />
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
