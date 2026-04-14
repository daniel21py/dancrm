import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Kanban, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
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
      const wonValue = (wonDeals.data ?? []).reduce((sum: number, d: Record<string, unknown>) => sum + (typeof d.value === 'number' ? d.value : 0), 0)

      return {
        companiesCount: companies.count ?? 0,
        contactsCount: contacts.count ?? 0,
        openDealsCount: openDeals.length,
        pipelineValue,
        wonValue,
      }
    },
  })

  const kpis = [
    { label: 'Clienti', value: stats?.companiesCount ?? 0, icon: Building2, color: 'bg-blue-500' },
    { label: 'Contatti', value: stats?.contactsCount ?? 0, icon: Users, color: 'bg-emerald-500' },
    { label: 'Deal aperti', value: stats?.openDealsCount ?? 0, icon: Kanban, color: 'bg-violet-500' },
    { label: 'Valore pipeline', value: formatCurrency(stats?.pipelineValue ?? 0), icon: TrendingUp, color: 'bg-amber-500' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Panoramica delle attivita</p>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className={`text-2xl font-bold text-slate-900 ${isLoading ? 'animate-pulse' : ''}`}>
              {isLoading ? '—' : value}
            </p>
          </div>
        ))}
      </div>

      {/* Fatturato vinto */}
      {stats && stats.wonValue > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-1 text-sm font-medium text-slate-500">Fatturato chiuso (Won)</h3>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.wonValue)}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && stats?.companiesCount === 0 && (
        <div className="mt-8 rounded-2xl border bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Inizia aggiungendo un cliente</h2>
          <p className="text-sm text-slate-500">
            Vai alla sezione Clienti per creare la tua prima azienda.
          </p>
        </div>
      )}
    </div>
  )
}
