import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckSquare, Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus, TaskPriority } from '@/types/database'
import { cn, formatDate } from '@/lib/utils'

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle; className: string }> = {
  pending: { label: 'Da fare', icon: Circle, className: 'text-slate-400' },
  in_progress: { label: 'In corso', icon: Clock, className: 'text-blue-500' },
  done: { label: 'Fatto', icon: CheckCircle2, className: 'text-emerald-500' },
  cancelled: { label: 'Annullato', icon: AlertCircle, className: 'text-slate-300' },
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: 'Bassa', className: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Media', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', className: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700' },
}

export function TasksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })

      if (filter === 'active') {
        query = query.in('status', ['pending', 'in_progress'])
      } else if (filter === 'done') {
        query = query.eq('status', 'done')
      }

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attivita</h1>
          <p className="text-sm text-slate-500">{tasks.length} {filter === 'active' ? 'attive' : filter === 'done' ? 'completate' : 'totali'}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuova attivita
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([['active', 'Attive'], ['done', 'Completate'], ['all', 'Tutte']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <CheckSquare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-1 text-lg font-semibold text-slate-900">Nessuna attivita</h3>
          <p className="text-sm text-slate-500">Crea la tua prima attivita.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const config = statusConfig[task.status]
            const Icon = config.icon
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => toggleTask.mutate({ id: task.id, status: task.status })}
                  className={cn('mt-0.5 flex-shrink-0 transition-colors', config.className)}
                >
                  <Icon className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900')}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', priorityConfig[task.priority].className)}>
                      {priorityConfig[task.priority].label}
                    </span>
                    {task.due_date && (
                      <span className={cn('text-xs', isOverdue ? 'font-medium text-red-600' : 'text-slate-400')}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <CreateTaskModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createTask.mutate(data)}
          isLoading={createTask.isPending}
        />
      )}
    </div>
  )
}

function CreateTaskModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void
  onSubmit: (data: Partial<Task>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
      status: 'pending',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nuova attivita</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titolo *</label>
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descrizione</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorita</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(priorityConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Scadenza</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annulla
            </button>
            <button type="submit" disabled={isLoading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              {isLoading ? 'Salvataggio...' : 'Crea attivita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
