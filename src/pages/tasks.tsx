import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckSquare, Circle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus, TaskPriority } from '@/types/database'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

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

export function TasksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })
      if (filter === 'active') query = query.in('status', ['pending', 'in_progress'])
      else if (filter === 'done') query = query.eq('status', 'done')
      const { data, error } = await query.limit(100)
      if (error) throw error
      return data as Task[]
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const createTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase.from('tasks').insert(task).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowForm(false)
    },
  })

  const tabs = [
    { key: 'active' as const, label: 'Attive' },
    { key: 'done' as const, label: 'Completate' },
    { key: 'all' as const, label: 'Tutte' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Attivita</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} {filter === 'active' ? 'attive' : filter === 'done' ? 'completate' : 'totali'}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nuova attivita
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
        <Spinner />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nessuna attivita"
          description="Crea la tua prima attivita per organizzare il lavoro."
          action={{ label: 'Nuova attivita', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => {
              const Icon = statusIcons[task.status]
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-muted-foreground/25"
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
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant={priorityConfig[task.priority].variant}>
                        {priorityConfig[task.priority].label}
                      </Badge>
                      {task.due_date && (
                        <span className={cn('text-2xs', isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Nuova attivita</DialogTitle>
        </DialogHeader>
        <CreateTaskForm onSubmit={(data) => createTask.mutate(data)} isLoading={createTask.isPending} />
      </Dialog>
    </div>
  )
}

function CreateTaskForm({ onSubmit, isLoading }: { onSubmit: (data: Partial<Task>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as TaskPriority, due_date: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title: form.title, description: form.description || null, priority: form.priority, due_date: form.due_date || null, status: 'pending' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Titolo</Label>
        <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>Descrizione</Label>
        <textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvataggio...' : 'Crea attivita'}
        </Button>
      </div>
    </form>
  )
}
