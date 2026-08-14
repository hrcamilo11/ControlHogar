import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ActivityEntry {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { display_name: string } | null
}

export function ActivityFeed({ homeId }: { homeId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_entries')
        .select('*, profiles:user_id(display_name)')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return data as ActivityEntry[]
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando actividad...</p>

  if (!entries?.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">No hay actividad registrada aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
      <div className="space-y-1">
        {entries.map((entry) => (
          <ActivityItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const displayName = entry.profiles?.display_name ?? 'Alguien'
  const message = formatActivityMessage(entry.action, entry.entity_type, entry.metadata)
  const color = getActivityColor(entry.action, entry.entity_type)
  const timeAgo = getRelativeTime(entry.created_at)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{displayName}</span>{' '}
          <span className="text-gray-600">{message}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
      </div>
    </div>
  )
}

function formatActivityMessage(
  action: string,
  entityType: string,
  metadata: Record<string, unknown> | null,
): string {
  const title = (metadata?.title as string) ?? ''

  const messages: Record<string, Record<string, string>> = {
    member: {
      joined: 'se unió al hogar',
      removed: 'fue eliminado del hogar',
    },
    task: {
      completed: `completó la tarea "${title}"`,
      created: `creó la tarea "${title}"`,
    },
    expense: {
      created: `registró un gasto "${title}" por $${formatAmount(metadata?.amount)}`,
    },
    maintenance: {
      pending: `registró mantenimiento "${title}"`,
      in_progress: `inició el mantenimiento "${title}"`,
      completed: `completó el mantenimiento "${title}"`,
    },
    home: {
      created: 'creó el hogar',
      ownership_transferred: 'transfirió la administración del hogar',
    },
  }

  return messages[entityType]?.[action] ?? `realizó acción "${action}" en ${entityType}`
}

function getActivityColor(action: string, entityType: string): string {
  const colors: Record<string, string> = {
    'member.joined': 'bg-blue-500',
    'member.removed': 'bg-gray-500',
    'task.completed': 'bg-green-500',
    'task.created': 'bg-blue-500',
    'expense.created': 'bg-emerald-500',
    'maintenance.pending': 'bg-orange-500',
    'maintenance.in_progress': 'bg-yellow-500',
    'maintenance.completed': 'bg-green-500',
    'home.created': 'bg-purple-500',
  }

  return colors[`${entityType}.${action}`] ?? 'bg-gray-400'
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function formatAmount(amount: unknown): string {
  if (typeof amount === 'number') return amount.toLocaleString('es-CO')
  if (typeof amount === 'string') return Number(amount).toLocaleString('es-CO')
  return '0'
}
