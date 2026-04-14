import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { PipelineStage } from '@/types/database'

export function SettingsPage() {
  const { tenant, member } = useAuthStore()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Impostazioni</h1>
        <p className="text-sm text-slate-500">Configura il tuo CRM</p>
      </div>

      <div className="space-y-6">
        {/* Tenant info */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Organizzazione</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Nome" value={tenant?.name} />
            <InfoField label="Email" value={tenant?.email} />
            <InfoField label="Telefono" value={tenant?.phone} />
            <InfoField label="P.IVA" value={tenant?.piva} />
            <InfoField label="Citta" value={tenant?.city} />
            <InfoField label="Piano" value={tenant?.plan} />
          </div>
        </section>

        {/* User info */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Il tuo profilo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Nome" value={member?.full_name} />
            <InfoField label="Ruolo" value={member?.role} />
          </div>
        </section>

        {/* Pipeline stages */}
        <PipelineStagesSettings />
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value || '—'}</p>
    </div>
  )
}

function PipelineStagesSettings() {
  const queryClient = useQueryClient()
  const [newStage, setNewStage] = useState({ name: '', color: '#6366F1' })

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

  const addStage = useMutation({
    mutationFn: async () => {
      const position = stages.length
      const { error } = await supabase.from('pipeline_stages').insert({
        name: newStage.name,
        color: newStage.color,
        position,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
      setNewStage({ name: '', color: '#6366F1' })
    },
  })

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  })

  return (
    <section className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Pipeline stages</h2>
      <p className="mb-4 text-sm text-slate-500">
        Configura gli stage della tua pipeline di vendita. L'ordine determina il flusso.
      </p>

      {stages.length > 0 ? (
        <div className="mb-4 space-y-2">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2"
            >
              <GripVertical className="h-4 w-4 text-slate-300" />
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="flex-1 text-sm font-medium text-slate-700">{stage.name}</span>
              {stage.is_won && <span className="text-xs text-emerald-600">Won</span>}
              {stage.is_lost && <span className="text-xs text-red-600">Lost</span>}
              <button
                onClick={() => deleteStage.mutate(stage.id)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-400">Nessuno stage configurato.</p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Nuovo stage</label>
          <input
            value={newStage.name}
            onChange={(e) => setNewStage(s => ({ ...s, name: e.target.value }))}
            placeholder="es. Lead, Qualificato, Proposta..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <input
          type="color"
          value={newStage.color}
          onChange={(e) => setNewStage(s => ({ ...s, color: e.target.value }))}
          className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200"
        />
        <button
          onClick={() => addStage.mutate()}
          disabled={!newStage.name.trim() || addStage.isPending}
          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Aggiungi
        </button>
      </div>
    </section>
  )
}
