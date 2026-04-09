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
  activation:     { color: '#16a34a' },
  error:          { color: '#d4d4d8' },
  success_streak: { color: '#16a34a' },
  paused:         { color: '#d4d4d8' },
  new:            { color: '#a8a29e' },
}

interface ActivityFeedProps {
  automations: AutomationItem[]
  executions: ExecutionItem[]
}

export function ActivityFeed({ automations, executions }: ActivityFeedProps) {
  const events = buildEvents(automations, executions)

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="text-center">
          <p className="text-sm font-light" style={{ color: '#a1a1aa' }}>Aucune activité</p>
          <p className="text-xs font-light mt-0.5" style={{ color: '#a1a1aa' }}>Les événements apparaîtront ici dès la première exécution</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const cfg = eventConfig[event.type]
        return (
          <li key={event.id} className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-light leading-tight truncate" style={{ color: '#27272a' }}>
                {event.message}
              </p>
              {event.subtext && (
                <p className="text-xs font-light mt-0.5 truncate" style={{ color: '#a1a1aa' }}>
                  {event.subtext}
                </p>
              )}
            </div>
            <p className="text-xs font-light shrink-0 mt-0.5" style={{ color: '#a1a1aa', letterSpacing: '0.05em' }}>
              {formatRelativeTime(event.at)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
