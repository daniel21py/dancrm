import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, Users, Kanban, TrendingUp, ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [companies, contacts, deals, wonDeals, recentActivities] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id, value, stage:pipeline_stages(is_won, is_lost)'),
        supabase.from('deals').select('value, stage:pipeline_stages!inner(is_won)').eq('stage.is_won', true),
        supabase.from('activities').select('id, type, title, occurred_at, company:companies(name)').order('occurred_at', { ascending: false }).limit(5),
      ])

      const allDeals = (deals.data ?? []) as Array<Record<string, unknown>>
      const openDeals = allDeals.filter(d => {
        const stage = d.stage as Record<string, boolean> | null
        return stage && !stage.is_won && !stage.is_lost
      })
      const pipelineValue = openDeals.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0)
      const wonValue = (wonDeals.data ?? []).reduce((sum: number, d: Record<string, unknown>) => sum + (typeof d.value === 'number' ? d.value : 0), 0)

      return {
        companiesCount: companies.count ?? 0,
        contactsCount: contacts.count ?? 0,
        openDealsCount: openDeals.length,
        pipelineValue,
        wonValue,
        recentActivities: recentActivities.data ?? [],
      }
    },
  })

  if (isLoading) return <Spinner />

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
        <p className="text-sm text-muted-foreground">Panoramica delle attivita</p>
      </div>

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

      {stats && stats.wonValue > 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Fatturato chiuso</p>
              <p className="text-3xl font-semibold tracking-tight text-emerald-400">
                {formatCurrency(stats.wonValue)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {stats?.companiesCount === 0 && (
        <EmptyState
          icon={Building2}
          title="Inizia aggiungendo un cliente"
          description="Vai alla sezione Clienti per creare la tua prima azienda e iniziare a tracciare la pipeline."
          action={{ label: 'Aggiungi cliente', onClick: () => window.location.href = '/clients' }}
        />
      )}
    </div>
  )
}
