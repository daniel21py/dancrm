import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  Kanban,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ActivityTimeline } from '@/components/activity-timeline'
import { CountUp } from '@/components/ui/count-up'
import { Sparkline } from '@/components/ui/sparkline'
import type { Task, TaskPriority, Activity } from '@/types/database'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

const priorityDot: Record<TaskPriority, string> = {
  low: 'bg-muted-foreground',
  medium: 'bg-primary',
  high: 'bg-amber-400',
  urgent: 'bg-destructive',
}

function fakeTrend(seed: string, len = 14): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const out: number[] = []
  let v = 50
  for (let i = 0; i < len; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const delta = ((h % 20) - 8) / 10
    v = Math.max(10, Math.min(100, v + delta * 8))
    out.push(v)
  }
  return out
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [companies, contacts, deals, wonDeals] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase
          .from('deals')
          .select('id, value, stage:pipeline_stages(is_won, is_lost)'),
        supabase
          .from('deals')
          .select('value, stage:pipeline_stages!inner(is_won)')
          .eq('stage.is_won', true),
      ])
      const allDeals = (deals.data ?? []) as Array<Record<string, unknown>>
      const openDeals = allDeals.filter((d) => {
        const stage = d.stage as Record<string, boolean> | null
        return stage && !stage.is_won && !stage.is_lost
      })
      const pipelineValue = openDeals.reduce(
        (sum, d) => sum + (typeof d.value === 'number' ? d.value : 0),
        0,
      )
      const wonValue = (wonDeals.data ?? []).reduce(
        (sum: number, d: Record<string, unknown>) =>
          sum + (typeof d.value === 'number' ? d.value : 0),
        0,
      )
      return {
        companiesCount: companies.count ?? 0,
        contactsCount: contacts.count ?? 0,
        openDealsCount: openDeals.length,
        pipelineValue,
        wonValue,
      }
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

  const { data: recentActivities = [], isLoading: activitiesLoading } =
    useQuery({
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
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today)
  const todayTasks = tasks.filter((t) => t.due_date === today)
  const upcomingTasks = tasks.filter((t) => !t.due_date || t.due_date > today)

  type Kpi = {
    label: string
    numeric: number
    format?: (n: number) => string
    icon: typeof Building2
    href: string
    trendSeed: string
  }

  const kpis: Kpi[] = [
    {
      label: 'Clienti',
      numeric: stats?.companiesCount ?? 0,
      icon: Building2,
      href: '/clients',
      trendSeed: 'clients',
    },
    {
      label: 'Contatti',
      numeric: stats?.contactsCount ?? 0,
      icon: Users,
      href: '/contacts',
      trendSeed: 'contacts',
    },
    {
      label: 'Deal aperti',
      numeric: stats?.openDealsCount ?? 0,
      icon: Kanban,
      href: '/deals',
      trendSeed: 'deals',
    },
    {
      label: 'Pipeline',
      numeric: stats?.pipelineValue ?? 0,
      format: (n) => formatCurrency(Math.round(n)),
      icon: TrendingUp,
      href: '/deals',
      trendSeed: 'pipeline',
    },
  ]

  const now = new Date()
  const dateLabel = now
    .toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .replace(/^\w/, (c) => c.toUpperCase())

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {dateLabel}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panoramica operativa del tuo workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Live
            </span>
          </div>
        </div>
      </div>

      {statsLoading ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      ) : (
        <motion.div
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {kpis.map(({ label, numeric, format, icon: Icon, href, trendSeed }) => {
            const trend = fakeTrend(trendSeed)
            const delta = Math.round(
              ((trend[trend.length - 1] - trend[0]) / trend[0]) * 100,
            )
            const up = delta >= 0
            return (
              <motion.div key={label} variants={item}>
                <Link to={href}>
                  <Card className="group relative overflow-hidden border-border/60 bg-card/60 backdrop-blur transition-all hover:border-primary/40 hover:shadow-card-hover">
                    <CardContent className="p-4">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium',
                            up
                              ? 'bg-primary/10 text-primary'
                              : 'bg-destructive/10 text-destructive',
                          )}
                        >
                          {up ? '+' : ''}
                          {delta}%
                        </div>
                      </div>

                      <p className="font-display text-2xl font-semibold tracking-tight tabular">
                        <CountUp
                          value={numeric}
                          format={format}
                          duration={900}
                        />
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {label}
                      </p>

                      <div className="mt-3 -mx-1 -mb-1">
                        <Sparkline
                          data={trend}
                          width={240}
                          height={32}
                          className="w-full"
                        />
                      </div>

                      <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {stats && stats.wonValue > 0 && (
        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="mb-6"
        >
          <Card className="overflow-hidden border-border/60 bg-gradient-to-r from-primary/[0.06] via-card to-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Fatturato chiuso · Anno in corso
                </p>
                <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-primary">
                  <CountUp
                    value={stats.wonValue}
                    format={(n) => formatCurrency(Math.round(n))}
                    duration={1100}
                  />
                </p>
              </div>
              <Sparkline
                data={fakeTrend('won-revenue', 20)}
                width={260}
                height={56}
                strokeWidth={2}
                fillOpacity={0.22}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Task</CardTitle>
              <Link
                to="/tasks"
                className="text-2xs text-muted-foreground transition-colors hover:text-primary"
              >
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
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="mb-2 h-6 w-6 text-primary/60" />
                <p className="text-sm text-muted-foreground">
                  Nessun task in sospeso. Ottimo lavoro!
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {overdueTasks.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Scadute ({overdueTasks.length})
                    </p>
                    {overdueTasks.map((task) => (
                      <TaskRow key={task.id} task={task} overdue />
                    ))}
                  </div>
                )}
                {todayTasks.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Oggi ({todayTasks.length})
                    </p>
                    {todayTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                )}
                {upcomingTasks.slice(0, 4).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Attività recenti</CardTitle>
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse-lime" />
            </div>
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
                emptyLabel="Nessuna attività recente. Registra la prima interazione da un cliente o contatto."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  overdue = false,
}: {
  task: Task
  overdue?: boolean
}) {
  const StatusIcon =
    task.status === 'in_progress'
      ? Clock
      : task.status === 'done'
        ? CheckCircle2
        : Circle
  return (
    <Link to="/tasks">
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60',
          overdue && 'bg-destructive/5',
        )}
      >
        <StatusIcon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            overdue ? 'text-destructive' : 'text-muted-foreground',
          )}
        />
        <span
          className={cn(
            'flex-1 truncate text-sm',
            task.status === 'done' && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </span>
        <div className="flex flex-shrink-0 items-center gap-2">
          {task.due_date && (
            <span
              className={cn(
                'font-mono text-[10px]',
                overdue
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {formatDate(task.due_date, 'd/M')}
            </span>
          )}
          <div
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              priorityDot[task.priority],
            )}
          />
        </div>
      </div>
    </Link>
  )
}
