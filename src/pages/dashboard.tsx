import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2, Users, Kanban, TrendingUp, ArrowUpRight,
  CheckCircle2, Circle, Clock, AlertCircle,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ActivityTimeline } from '@/components/activity-timeline'
import type { Task, TaskPriority, Activity } from '@/types/database'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

const priorityDot: Record<TaskPriority, string> = {
  low: 'bg-muted-foreground',
  medium: 'bg-primary',
  high: 'bg-amber-400',
  urgent: 'bg-destructive',
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [companies, contacts, deals, wonDeals] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id, value, stage:pipeline_stages(is_won, is_lost)'),
        supabase.from('deals').select('value, stage:pipeline_stages!inner(is_won)').eq('stage.is_won', true),
      ])
      const allDeals = (deals.data ?? []) as Array<Record<string, unknown>>
      const openDeals = allDeals.filter(d => {
        const stage = d.stage as Record<string, boolean> | null
        return stage && !stage.is_won && !stage.is_lost
      })
      const pipelineValue = openDeals.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0)
      const wonValue = (wonDeals.data ?? []).reduce(
        (sum: number, d: Record<string, unknown>) => sum + (typeof d.value === 'number' ? d.value : 0), 0
      )
      return { companiesCount: companies.count ?? 0, contactsCount: contacts.count ?? 0, openDealsCount: openDeals.length, pipelineValue, wonValue }
    },
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .or(`due_date.lte.${today},due_date.is.null`)
        .order('priority', { ascending: false })
        .limit(8)
      if (error) throw error
      return data as Task[]
    },
  })

  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data as Activity[]
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today)
  const todayTasks = tasks.filter(t => t.due_date === today)
  const upcomingTasks = tasks.filter(t => !t.due_date || t.due_date > today)

  const kpis = [
    { label: 'Clienti', value: String(stats?.companiesCount ?? 0), icon: Building2, href: '/clients', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Contatti', value: String(stats?.contactsCount ?? 0), icon: Users, href: '/contacts', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Deal aperti', value: String(stats?.openDealsCount ?? 0), icon: Kanban, href: '/deals', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Pipeline', value: formatCurrency(stats?.pipelineValue ?? 0), icon: TrendingUp, href: '/deals', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {statsLoading ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
        </div>
      ) : (
        <motion.div
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {kpis.map(({ label, value, icon: Icon, href, color, bg }) => (
            <motion.div key={label} variants={item}>
              <Link to={href}>
                <Card className="group cursor-pointer transition-colors hover:border-muted-foreground/25">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-2xl font-semibold tracking-tight">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {stats && stats.wonValue > 0 && (
        <motion.div variants={item} initial="hidden" animate="show" className="mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Fatturato chiuso</p>
              <p className="text-3xl font-semibold tracking-tight text-emerald-400">
                {formatCurrency(stats.wonValue)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Task</CardTitle>
              <Link to="/tasks" className="text-2xs text-muted-foreground transition-colors hover:text-foreground">
                Vedi tutte →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nessun task in sospeso. Ottimo lavoro!
              </p>
            ) : (
              <div className="space-y-0.5">
                {overdueTasks.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Scadute ({overdueTasks.length})
                    </p>
                    {overdueTasks.map(task => <TaskRow key={task.id} task={task} overdue />)}
                  </div>
                )}
                {todayTasks.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                      Oggi ({todayTasks.length})
                    </p>
                    {todayTasks.map(task => <TaskRow key={task.id} task={task} />)}
                  </div>
                )}
                {upcomingTasks.slice(0, 4).map(task => <TaskRow key={task.id} task={task} />)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Attivita recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityTimeline
                activities={recentActivities}
                emptyLabel="Nessuna attivita recente. Registra la prima interazione da un cliente o contatto."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TaskRow({ task, overdue = false }: { task: Task; overdue?: boolean }) {
  const StatusIcon = task.status === 'in_progress' ? Clock : task.status === 'done' ? CheckCircle2 : Circle
  return (
    <Link to="/tasks">
      <div className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50',
        overdue && 'bg-destructive/5'
      )}>
        <StatusIcon className={cn('h-4 w-4 flex-shrink-0', overdue ? 'text-destructive' : 'text-muted-foreground')} />
        <span className={cn('flex-1 truncate text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>
          {task.title}
        </span>
        <div className="flex flex-shrink-0 items-center gap-2">
          {task.due_date && (
            <span className={cn('text-2xs', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
              {formatDate(task.due_date, 'd/M')}
            </span>
          )}
          <div className={cn('h-1.5 w-1.5 rounded-full', priorityDot[task.priority])} />
        </div>
      </div>
    </Link>
  )
}
