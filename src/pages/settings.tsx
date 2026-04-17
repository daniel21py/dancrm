import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { PipelineStage } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'

export function SettingsPage() {
  const { tenant, member } = useAuthStore()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Configura il tuo workspace</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizzazione</CardTitle>
            <CardDescription>Informazioni sulla tua azienda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nome" value={tenant?.name} />
              <Field label="Email" value={tenant?.email} />
              <Field label="Telefono" value={tenant?.phone} />
              <Field label="P.IVA" value={tenant?.piva} />
              <Field label="Citta" value={tenant?.city} />
              <Field label="Piano" value={tenant?.plan} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profilo</CardTitle>
            <CardDescription>Il tuo account utente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar name={member?.full_name ?? 'U'} size="lg" />
              <div>
                <p className="font-medium">{member?.full_name ?? 'Utente'}</p>
                <Badge variant="secondary" className="mt-1">{member?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <PipelineStagesSection />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || '—'}</p>
    </div>
  )
}

function PipelineStagesSection() {
  const queryClient = useQueryClient()
  const { member } = useAuthStore()
  const [newStage, setNewStage] = useState({ name: '', color: '#6366F1' })

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipeline_stages').select('*').order('position')
      if (error) throw error
      return data as PipelineStage[]
    },
  })

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const tid = member!.tenant_id
      const defaults = [
        { tenant_id: tid, name: 'Primo Contatto', color: '#3B82F6', position: 0, is_won: false, is_lost: false },
        { tenant_id: tid, name: 'Qualificazione', color: '#8B5CF6', position: 1, is_won: false, is_lost: false },
        { tenant_id: tid, name: 'Proposta', color: '#F59E0B', position: 2, is_won: false, is_lost: false },
        { tenant_id: tid, name: 'Negoziazione', color: '#EF4444', position: 3, is_won: false, is_lost: false },
        { tenant_id: tid, name: 'Chiuso Vinto', color: '#10B981', position: 4, is_won: true, is_lost: false },
        { tenant_id: tid, name: 'Chiuso Perso', color: '#6B7280', position: 5, is_won: false, is_lost: true },
      ]
      const { error } = await supabase.from('pipeline_stages').insert(defaults)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  })

  const addStage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pipeline_stages').insert({
        tenant_id: member!.tenant_id,
        name: newStage.name,
        color: newStage.color,
        position: stages.length,
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline</CardTitle>
        <CardDescription>Configura gli stage della pipeline di vendita</CardDescription>
      </CardHeader>
      <CardContent>
        {stages.length === 0 && (
          <div className="mb-4 rounded-lg border border-dashed border-border p-4 text-center">
            <p className="mb-2 text-sm text-muted-foreground">Nessuno stage configurato.</p>
            <Button onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending} variant="outline" size="sm">
              {seedDefaults.isPending ? 'Creazione...' : 'Usa pipeline predefinita'}
            </Button>
          </div>
        )}

        {stages.length > 0 && (
          <div className="mb-4 space-y-1">
            <AnimatePresence>
              {stages.map((stage) => (
                <motion.div
                  key={stage.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="flex-1 text-sm font-medium">{stage.name}</span>
                  {stage.is_won && <Badge variant="success">Won</Badge>}
                  {stage.is_lost && <Badge variant="destructive">Lost</Badge>}
                  <button
                    onClick={() => deleteStage.mutate(stage.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Nuovo stage</Label>
            <Input
              value={newStage.name}
              onChange={(e) => setNewStage(s => ({ ...s, name: e.target.value }))}
              placeholder="es. Lead, Qualificato, Proposta..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newStage.name.trim()) {
                  e.preventDefault()
                  addStage.mutate()
                }
              }}
            />
          </div>
          <input
            type="color"
            value={newStage.color}
            onChange={(e) => setNewStage(s => ({ ...s, color: e.target.value }))}
            className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent"
          />
          <Button
            onClick={() => addStage.mutate()}
            disabled={!newStage.name.trim() || addStage.isPending}
            size="default"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
