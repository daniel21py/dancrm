import { motion } from 'framer-motion'
import {
  Phone, Mail, Users, FileText, CheckCircle2, MessageCircle,
  Linkedin, MapPin, Circle, Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Activity, ActivityType } from '@/types/database'
import { formatDateRelative, cn } from '@/lib/utils'

const activityConfig: Record<ActivityType, { icon: LucideIcon; label: string; color: string }> = {
  call:      { icon: Phone,         label: 'Chiamata',  color: 'text-blue-400 bg-blue-500/10' },
  email:     { icon: Mail,          label: 'Email',     color: 'text-violet-400 bg-violet-500/10' },
  meeting:   { icon: Users,         label: 'Meeting',   color: 'text-emerald-400 bg-emerald-500/10' },
  note:      { icon: FileText,      label: 'Nota',      color: 'text-muted-foreground bg-muted' },
  task_done: { icon: CheckCircle2,  label: 'Task',      color: 'text-emerald-400 bg-emerald-500/10' },
  whatsapp:  { icon: MessageCircle, label: 'WhatsApp',  color: 'text-emerald-400 bg-emerald-500/10' },
  linkedin:  { icon: Linkedin,      label: 'LinkedIn',  color: 'text-blue-400 bg-blue-500/10' },
  visit:     { icon: MapPin,        label: 'Visita',    color: 'text-amber-400 bg-amber-500/10' },
  other:     { icon: Circle,        label: 'Altro',     color: 'text-muted-foreground bg-muted' },
}

interface ActivityTimelineProps {
  activities: Activity[]
  emptyLabel?: string
}

export function ActivityTimeline({ activities, emptyLabel = 'Nessuna attivita' }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
      {activities.map((activity, i) => {
        const config = activityConfig[activity.type]
        const Icon = config.icon
        return (
          <motion.div
            key={activity.id}
            className="relative flex gap-3"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div className={cn(
              'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-background',
              config.color
            )}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {activity.title ?? config.label}
                </p>
                <span className="flex-shrink-0 text-2xs text-muted-foreground">
                  <Clock className="inline h-3 w-3 mr-0.5 align-text-top" />
                  {formatDateRelative(activity.occurred_at)}
                </span>
              </div>
              {activity.body && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {activity.body}
                </p>
              )}
              {activity.duration_min && (
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  Durata: {activity.duration_min} min
                </p>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export { activityConfig }
