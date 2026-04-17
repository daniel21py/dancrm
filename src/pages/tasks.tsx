import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, CheckSquare, Circle, Clock, CheckCircle2, XCircle, AlertCircle, Building2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus, TaskPriority, Company, Contact } from '@/types/database'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'

const statusIcons: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  cancelled: XCircle,
}

const statusColors: Record<TaskStatus, string> = {
  pending: 'text-muted-foreground hover:text-foreground',
  in_progress: 'text-primary hover:text-primary/80',
  done: 'text-emerald-400 hover:text-emerald-300',
  cancelled: 'text-muted-foreground/50',
}

const priorityConfig: Record<TaskPriority, { label: string; variant: 'secondary' | 'default' | 'warning' | 'destructive' }> = {
  low: { label: 'Bassa', variant: 'secondary' },
  medium: { label: 'Media', variant: 'default' },
  high: { label: 'Alta', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
}

type TaskWithRelations = Task & {
  company: Pick<Company, 'id' | 'name'> | null
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const { member } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*, company:companies(id, name), contact:contacts(id, first_name, last_name)')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (filter === 'active') query = query.in('status', ['pending', 'in_progress'])
      else if (filter === 'done') query = query.eq('status', 'done')
      const { data, error } = await query.limit(100)
      if (error) throw error
      return data as TaskWithRelations[]
    },
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      return (data ?? []) as Pick<Company, 'id' | 'name'>[]
    },
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('id, first_name, last_name').order('first_name')
      return (data ?? []) as Pick<Contact, 'id' | 'first_name' | 'last_name'>[]
    },
  })

  const toggleTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const newStatus = status === 'done' ? 'pending' : 'done'
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] })
    },
    onError: () => toast.error('Errore nell\'aggiornamento'),
  })

  const createTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...task, tenant_id: member!.tenant_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] })
      setShowForm(false)
      toast.success('Task creato')
    },
    onError: () => toast.error('Errore nella creazione'),
  })

  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = filter === 'active' ? tasks.filter(t => t.due_date && t.due_date < today) : []
  const regularTasks = filter === 'active' ? tasks.filter(t => !t.due_date || t.due_date >= today) : tasks

  const tabs = [
    { key: 'active' as const, label: 'Attive' },
    { key: 'done' as const, label: 'Completate' },
    { key: 'all' as const, label: 'Tutte' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Task</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} {filter === 'active' ? 'attivi' : filter === 'done' ? 'completati' : 'totali'}
            {overdueTasks.length > 0 && (
              <span className="ml-1 text-destructive">· {overdueTasks.length} scaduti</span>
            )}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuovo task
        </Button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {filter === key && (
              <motion.div layoutId="task-tab" className="absolute inset-0 rounded-md bg-accent" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={filter === 'done' ? 'Nessun task completato' : 'Nessun task'}
          description={filter === 'active' ? 'Crea il tuo primo task per organizzare il lavoro.' : 'Nessun task da mostrare.'}
          action={filter === 'active' ? { label: 'Nuovo task', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-1">
          {overdueTasks.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Scaduti ({overdueTasks.length})
              </p>
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {overdueTasks.map(task => (
                    <TaskRow key={task.id} task={task} overdue toggleTask={toggleTask} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {regularTasks.map(task => (
              <TaskRow key={task.id} task={task} toggleTask={toggleTask} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Nuovo task</DialogTitle>
        </DialogHeader>
        <CreateTaskForm
          companies={companies}
          contacts={contacts}
          onSubmit={(data) => createTask.mutate(data)}
          isLoading={createTask.isPending}
        />
      </Dialog>
    </div>
  )
}

function TaskRow({
  task, overdue = false, toggleTask,
}: {
  task: TaskWithRelations
  overdue?: boolean
  toggleTask: { mutate: (args: { id: string; status: TaskStatus }) => void }
}) {
  const Icon = statusIcons[task.status]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-muted-foreground/25',
        overdue && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <button
        onClick={() => toggleTask.mutate({ id: task.id, status: task.status })}
        className={cn('mt-0.5 flex-shrink-0 transition-colors', statusColors[task.status])}
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', task.status === 'done' ? 'text-muted-foreground line-through' : 'font-medium')}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge variant={priorityConfig[task.priority].variant}>
            {priorityConfig[task.priority].label}
          </Badge>
          {task.due_date && (
            <span className={cn('text-2xs', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
              {formatDate(task.due_date)}
            </span>
          )}
          {task.company && (
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Building2 className="h-2.5 w-2.5" />
              {task.company.name}
            </span>
          )}
          {task.contact && (
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              {task.contact.first_name} {task.contact.last_name}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function CreateTaskForm({
  companies, contacts, onSubmit, isLoading,
}: {
  companies: Pick<Company, 'id' | 'name'>[]
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'>[]
  onSubmit: (data: Partial<Task>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium' as TaskPriority,
    due_date: '', company_id: '', contact_id: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
      company_id: form.company_id || null,
      contact_id: form.contact_id || null,
      status: 'pending',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Titolo</Label>
        <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus placeholder="es. Follow-up con Marco Rossi" />
      </div>
      <div className="space-y-1.5">
        <Label>Descrizione</Label>
        <textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Dettagli opzionali..."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Priorita</Label>
          <Select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
            {Object.entries(priorityConfig).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Scadenza</Label>
          <Input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Azienda</Label>
          <Select value={form.company_id} onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}>
            <option value="">Nessuna</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Contatto</Label>
          <Select value={form.contact_id} onChange={(e) => setForm(f => ({ ...f, contact_id: e.target.value }))}>
            <option value="">Nessuno</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvataggio...' : 'Crea task'}
        </Button>
      </div>
    </form>
  )
}
