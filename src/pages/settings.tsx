import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, GripVertical, Sun, Moon, Database, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { seedDemoData } from '@/lib/seed-data'
import type { PipelineStage, Tenant } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const { tenant, member } = useAuthStore()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Configura il tuo workspace</p>
      </div>

      <div className="space-y-4">
        <OrgInfoSection tenant={tenant} />

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

        <AppearanceSection />
        <PipelineStagesSection />
        <DemoDataSection />
      </div>
    </div>
  )
}

function OrgInfoSection({ tenant }: { tenant: Tenant | null }) {
  const { refreshTenant } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: tenant?.name ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    piva: tenant?.piva ?? '',
    city: tenant?.city ?? '',
    website: tenant?.website ?? '',
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant) return
      const { error } = await supabase
        .from('tenants')
        .update({
          name: form.name || null,
          email: form.email || null,
          phone: form.phone || null,
          piva: form.piva || null,
          city: form.city || null,
          website: form.website || null,
        })
        .eq('id', tenant.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await refreshTenant()
      setEditing(false)
      toast.success('Dati organizzazione aggiornati')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Organizzazione</CardTitle>
            <CardDescription>Informazioni sulla tua azienda</CardDescription>
          </div>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => {
              setForm({
                name: tenant?.name ?? '',
                email: tenant?.email ?? '',
                phone: tenant?.phone ?? '',
                piva: tenant?.piva ?? '',
                city: tenant?.city ?? '',
                website: tenant?.website ?? '',
              })
              setEditing(true)
            }}>
              <Pencil className="h-3.5 w-3.5" />
              Modifica
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                <Check className="h-3.5 w-3.5" />
                {save.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: 'name', label: 'Nome' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Telefono' },
              { key: 'piva', label: 'P.IVA' },
              { key: 'city', label: 'Città' },
              { key: 'website', label: 'Sito web' },
            ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nome" value={tenant?.name} />
            <Field label="Email" value={tenant?.email} />
            <Field label="Telefono" value={tenant?.phone} />
            <Field label="P.IVA" value={tenant?.piva} />
            <Field label="Città" value={tenant?.city} />
            <Field label="Piano" value={tenant?.plan} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  const { theme, toggle } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aspetto</CardTitle>
        <CardDescription>Tema dell'interfaccia</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">{isDark ? 'Tema scuro' : 'Tema chiaro'}</p>
              <p className="text-xs text-muted-foreground">{isDark ? 'Modalità notte attiva' : 'Modalità giorno attiva'}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isDark ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                isDark ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function DemoDataSection() {
  const { member } = useAuthStore()
  const queryClient = useQueryClient()
  const [done, setDone] = useState(false)

  const seed = useMutation({
    mutationFn: () => seedDemoData(member!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries()
      setDone(true)
      toast.success('Dati demo caricati con successo!')
    },
    onError: (err: Error) => toast.error('Errore: ' + err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dati Demo</CardTitle>
        <CardDescription>Carica un dataset realistico per esplorare tutte le funzionalità</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <Check className="h-4 w-4" />
            Dataset demo caricato. Esplora clienti, deal, task e attività.
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Verranno inseriti: <span className="text-foreground">5 aziende</span> del settore logistico,{' '}
                <span className="text-foreground">10 contatti</span>,{' '}
                <span className="text-foreground">6 deal</span> nelle varie fasi pipeline,{' '}
                <span className="text-foreground">8 task</span> (alcuni scaduti) e{' '}
                <span className="text-foreground">15 attività</span> realistiche.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => seed.mutate()}
              disabled={seed.isPending}
              className="shrink-0"
            >
              <Database className="h-4 w-4" />
              {seed.isPending ? 'Caricamento...' : 'Carica dati demo'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
      toast.success('Pipeline predefinita creata')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
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
      toast.success('Stage aggiunto')
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  })

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
      toast.success('Stage eliminato')
    },
    onError: () => toast.error("Errore durante l'eliminazione"),
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStage(s => ({ ...s, name: e.target.value }))}
              placeholder="es. Lead, Qualificato, Proposta..."
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
