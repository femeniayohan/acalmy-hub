import { formatRelativeTime } from '@/lib/utils'

interface AutomationItem {
  id: string
  name: string
  status: string
  activated_at: string | null
  created_at: string
}

interface ExecutionItem {
  id: string
  status: string
  ran_at: string
  error_message: string | null
  automation?: { name: string } | null
}

interface ActivityEvent {
  id: string
  type: 'activation' | 'error' | 'success_streak' | 'paused' | 'new'
  message: string
  subtext?: string
  at: string
}

function buildEvents(automations: AutomationItem[], executions: ExecutionItem[]): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const a of automations) {
    if (a.activated_at) {
      events.push({
        id: `activation-${a.id}`,
        type: 'activation',
        message: `${a.name} activée`,
        subtext: 'Votre automatisation est en ligne',
        at: a.activated_at,
      })
    }
  }

  const errors = executions.filter(e => e.status === 'error').slice(0, 3)
  for (const e of errors) {
    events.push({
      id: `error-${e.id}`,
      type: 'error',
      message: `Erreur sur ${e.automation?.name ?? 'Automatisation'}`,
      subtext: e.error_message?.slice(0, 80) ?? 'Erreur inattendue',
      at: e.ran_at,
    })
  }

  const successes = executions.filter(e => e.status === 'success').slice(0, 5)
  for (const e of successes) {
    events.push({
      id: `success-${e.id}`,
      type: 'success_streak',
      message: `${e.automation?.name ?? 'Automatisation'} exécutée avec succès`,
      at: e.ran_at,
    })
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8)
}

const eventConfig = {
  activation: { dot: 'bg-[#16a34a]', icon: '⚡' },
  error: { dot: 'bg-[#dc2626]', icon: '⚠' },
  success_streak: { dot: 'bg-[#16a34a] opacity-60', icon: '✓' },
  paused: { dot: 'bg-[#d97706]', icon: '⏸' },
  new: { dot: 'bg-[#2563eb]', icon: '✦' },
}

interface ActivityFeedProps {
  automations: AutomationItem[]
  executions: ExecutionItem[]
}

export function ActivityFeed({ automations, executions }: ActivityFeedProps) {
  const events = buildEvents(automations, executions)

  if (events.length === 0) {
    return (
      <p className="text-sm text-[rgba(0,0,0,0.35)] text-center py-4">
        Aucune activité récente.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const cfg = eventConfig[event.type]
        return (
          <li key={event.id} className="flex items-start gap-3">
            <div className="relative shrink-0 mt-1.5">
              <span className={`block w-2 h-2 rounded-full ${cfg.dot}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#0a0a0a] font-medium leading-tight truncate">
                {event.message}
              </p>
              {event.subtext && (
                <p className="text-[11px] text-[rgba(0,0,0,0.4)] mt-0.5 truncate">
                  {event.subtext}
                </p>
              )}
            </div>
            <p className="text-[11px] text-[rgba(0,0,0,0.3)] shrink-0 mt-0.5">
              {formatRelativeTime(event.at)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
