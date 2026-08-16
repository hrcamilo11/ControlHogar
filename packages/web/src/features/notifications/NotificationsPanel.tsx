import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Bell, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export function NotificationsPanel() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('app_notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('app_notifications').update({ is_read: true }).eq('user_id', session!.user.id).eq('is_read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Todas marcadas como leídas')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('app_notifications').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  if (isLoading) return <p className="text-sm text-gray-500">Cargando notificaciones...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            <Check className="h-3.5 w-3.5" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications?.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay notificaciones</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications?.map((notif) => (
          <div
            key={notif.id}
            className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
              notif.is_read 
                ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800' 
                : 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-950'
            }`}
          >
            <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${notif.is_read ? 'bg-transparent' : getNotifColor(notif.type)}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${notif.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'}`}>{notif.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.body}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                {new Date(notif.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notif.is_read && (
                <button onClick={() => markReadMutation.mutate(notif.id)} className="rounded p-1 text-gray-400 hover:text-primary-600 hover:bg-gray-100" title="Marcar como leída">
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => deleteMutation.mutate(notif.id)} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100" title="Eliminar">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Badge that shows unread notification count.
 * Use in the navigation tab.
 */
export function NotificationBadge() {
  const { session } = useAuth()

  const { data: count } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session!.user.id)
        .eq('is_read', false)
      if (error) return 0
      return count ?? 0
    },
    refetchInterval: 30000, // Poll every 30s
  })

  if (!count || count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function getNotifColor(type: string): string {
  if (type.includes('task')) return 'bg-blue-500'
  if (type.includes('payment') || type.includes('expense')) return 'bg-green-500'
  if (type.includes('maintenance')) return 'bg-orange-500'
  if (type.includes('member')) return 'bg-purple-500'
  return 'bg-gray-500'
}
