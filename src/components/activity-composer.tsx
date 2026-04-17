import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Activity, ActivityType } from '@/types/database'
import { activityConfig } from './activity-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ActivityComposerProps {
  companyId?: string
  contactId?: string
  dealId?: string
  tenantId: string
  onCreated?: () => void
}

const quickTypes: ActivityType[] = ['call', 'email', 'meeting', 'note', 'whatsapp', 'visit']

export function ActivityComposer({ companyId, contactId, dealId, tenantId, onCreated }: ActivityComposerProps) {
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState<ActivityType | null>(null)
  const [form, setForm] = useState({ title: '', body: '', duration_min: '' })

  const createActivity = useMutation({
    mutationFn: async () => {
      if (!activeType) return
      const payload: Partial<Activity> = {
        tenant_id: tenantId,
        type: activeType,
        title: form.title || null,
        body: form.body || null,
        duration_min: form.duration_min ? parseInt(form.duration_min) : null,
        company_id: companyId ?? null,
        contact_id: contactId ?? null,
        deal_id: dealId ?? null,
      }
      const { error } = await supabase.from('activities').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      setActiveType(null)
      setForm({ title: '', body: '', duration_min: '' })
      onCreated?.()
    },
  })

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Registra:</span>
        {quickTypes.map((type) => {
          const config = activityConfig[type]
          const Icon = config.icon
          const isActive = activeType === type
          return (
            <button
              key={type}
              onClick={() => {
                setActiveType(isActive ? null : type)
                setForm({ title: '', body: '', duration_min: '' })
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                isActive
                  ? config.color
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {activeType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createActivity.mutate()
              }}
              className="mt-3 space-y-2"
            >
              <Input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={activeType === 'note' ? 'Titolo nota (opzionale)' : 'Titolo (opzionale)'}
                autoFocus
              />
              <textarea
                value={form.body}
                onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={activeType === 'note' ? 'Scrivi una nota...' : 'Dettagli...'}
                rows={2}
                className="flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div className="flex items-center justify-between">
                {(activeType === 'call' || activeType === 'meeting') ? (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Durata (min)</Label>
                    <Input
                      type="number"
                      value={form.duration_min}
                      onChange={(e) => setForm(f => ({ ...f, duration_min: e.target.value }))}
                      className="h-7 w-20"
                    />
                  </div>
                ) : <div />}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveType(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Annulla
                  </Button>
                  <Button type="submit" size="sm" disabled={createActivity.isPending}>
                    {createActivity.isPending ? 'Salvataggio...' : 'Registra'}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
