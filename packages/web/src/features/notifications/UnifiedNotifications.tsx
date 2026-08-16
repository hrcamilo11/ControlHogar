import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Bell, Check, Trash2, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

type FilterType = 'all' | 'alerts' | 'activity'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

interface ActivityEntry {
  id: string
  action: string
  entity_type: string
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { display_name: string } | null
}

export function UnifiedNotifications({ homeId }: { homeId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')

  // Alerts (app_notifications)
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_notifications').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false }).limit(30)
      if (error) throw error
      return data as Notification[]
    },
  })

  // Activity feed
  const { data: activity } = useQuery({
    queryKey: ['activity', homeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_entries').select('*, profiles:user_id(display_name)').eq('home_id', homeId).order('created_at', { ascending: false }).limit(30)
      if (error) throw error
      return data as ActivityEntry[]
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('app_notifications').update({ is_read: true }).eq('user_id', session!.user.id).eq('is_read', false)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Todas marcadas como leídas') },
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('app_notifications').update({ is_read: true }).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('app_notifications').delete().eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  // Merge and sort by date
  type UnifiedItem = { id: string; type: 'alert' | 'activity'; title: string; body: string; date: string; isRead?: boolean; color: string }

  const items: UnifiedItem[] = []

  if (filter !== 'activity') {
    for (const n of notifications ?? []) {
      items.push({ id: n.id, type: 'alert', title: n.title, body: n.body, date: n.created_at, isRead: n.is_read, color: getAlertColor(n.type) })
    }
  }

  if (filter !== 'alerts') {
    for (const a of activity ?? []) {
      const name = a.profiles?.display_name ?? 'Alguien'
      const message = formatAction(a.action, a.entity_type, a.metadata)
      items.push({ id: `act-${a.id}`, type: 'activity', title: name, body: message, date: a.created_at, color: getActivityColor(a.entity_type) })
    }
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        {unreadCount > 0 && (
          <button onClick={() => markAllReadMutation.mutate()} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
            <Check className="h-3.5 w-3.5" /> Marcar todo leído
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {([
          { key: 'all', label: 'Todo' },
          { key: 'alerts', label: 'Requiere acción' },
          { key: 'activity', label: 'Actividad' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filter === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{label}</button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay notificaciones</p>
        </div>
      )}

      <div className="space-y-2">
        {items.slice(0, 50).map((item) => (
          <div
            key={item.id}
            className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
              item.type === 'alert' && !item.isRead
                ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-950'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{item.title}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{item.body}</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-gray-400">{formatTimeAgo(item.date)}</p>
                {item.type === 'alert' && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">Alerta</span>}
              </div>
            </div>
            {item.type === 'alert' && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!item.isRead && (
                  <button onClick={() => markReadMutation.mutate(item.id)} className="rounded p-1 text-gray-400 hover:text-primary-600 hover:bg-gray-100" title="Marcar leída"><Check className="h-3.5 w-3.5" /></button>
                )}
                <button onClick={() => deleteMutation.mutate(item.id)} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function getAlertColor(type: string): string {
  if (type.includes('task')) return 'bg-blue-500'
  if (type.includes('payment') || type.includes('expense')) return 'bg-green-500'
  if (type.includes('maintenance')) return 'bg-orange-500'
  return 'bg-red-500'
}

function getActivityColor(entityType: string): string {
  switch (entityType) {
    case 'task': return 'bg-blue-400'
    case 'expense': return 'bg-green-400'
    case 'maintenance': return 'bg-orange-400'
    case 'member': return 'bg-purple-400'
    default: return 'bg-gray-400'
  }
}

function formatAction(action: string, entityType: string, metadata: Record<string, unknown> | null): string {
  const title = (metadata?.title as string) ?? ''
  const messages: Record<string, Record<string, string>> = {
    member: { joined: 'se unió al hogar', removed: 'fue eliminado del hogar' },
    task: { completed: `completó "${title}"`, created: `creó tarea "${title}"` },
    expense: { created: `registró gasto "${title}"` },
    maintenance: { pending: `registró "${title}"`, in_progress: `inició "${title}"`, completed: `completó "${title}"` },
    home: { created: 'creó el hogar' },
  }
  return messages[entityType]?.[action] ?? `${action} en ${entityType}`
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `Hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
