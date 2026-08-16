import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { calculateNextDueDate } from '@controlhogar/shared/src/modules/tasks/task-recurrence'
import { RotationStats, getNextFairAssignee } from './TaskRotation'
import { SubtaskList } from './SubtaskList'
import { TaskComments } from './TaskComments'
import { Pencil, Trash2, Pause, Play, Check, Loader2, Camera, MessageCircle, Wrench } from 'lucide-react'
import { undoableDelete } from '@/lib/undoableAction'
import { useConfirm } from '@/components/ConfirmDialog'

interface Task {
  id: string
  title: string
  description: string | null
  frequency_type: string
  frequency_config: Record<string, unknown> | null
  next_due_date: string | null
  is_active: boolean
  created_by: string
  rotation_enabled: boolean
  rotation_members: string[]
  rotation_index: number
  task_type: 'task' | 'maintenance'
  priority: 'high' | 'medium' | 'low' | null
  status: 'active' | 'in_progress' | 'completed'
  completed_by: string | null
  completed_at: string | null
  created_at: string
  task_assignments: { user_id: string }[]
}

interface TaskCompletion {
  id: string
  task_id: string
  completed_by: string
  completed_at: string
  was_overdue: boolean
  tasks: { title: string }
  profiles: { display_name: string }
}

interface Member {
  user_id: string
  role?: string
  profiles: { display_name: string } | null
}

type SortOption = 'date' | 'title' | 'frequency'

export function TasksPanel({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState<'list' | 'history'>('list')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: members } = useQuery({
    queryKey: ['home-members-full', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_members')
        .select('user_id, role, profiles(display_name)')
        .eq('home_id', homeId)
      if (error) throw error
      return (data ?? []).map((m: any) => ({
        user_id: m.user_id as string,
        role: m.role as string,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
      })) as Member[]
    },
  })

  const currentUserRole = members?.find((m) => m.user_id === session?.user.id)?.role

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, task_assignments(user_id)')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Task[]
    },
  })

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const task = tasks?.find((t) => t.id === taskId)
      if (!task) throw new Error('Tarea no encontrada')

      const wasOverdue = task.next_due_date ? new Date(task.next_due_date) < new Date() : false

      // Insert completion
      await supabase.from('task_completions').insert({
        task_id: taskId,
        completed_by: session!.user.id,
        due_date: task.next_due_date ?? null,
        was_overdue: wasOverdue,
      })

      if (task.frequency_type === 'once') {
        // Archive one-time task
        await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
      } else {
        // Calculate next due using shared logic with frequency_config
        const config = task.frequency_config as { dayOfWeek?: number; daysOfWeek?: number[]; dayOfMonth?: number; intervalDays?: number } | null
        const nextDue = calculateNextDueDate(task.frequency_type as any, config, new Date())

        const updateData: Record<string, unknown> = { next_due_date: nextDue }

        // Handle rotation — use fair assignment (least completions)
        if (task.rotation_enabled && task.rotation_members.length >= 2) {
          // Get completion counts for fair rotation
          const { data: completions } = await supabase
            .from('task_completions')
            .select('completed_by')
            .eq('task_id', taskId)

          const counts: Record<string, number> = {}
          for (const uid of task.rotation_members) {
            counts[uid] = 0
          }
          for (const c of completions ?? []) {
            if (counts[c.completed_by] !== undefined) {
              counts[c.completed_by]!++
            }
          }

          const { nextUserId, nextIndex } = getNextFairAssignee(
            task.rotation_members,
            task.rotation_index,
            counts,
          )

          updateData.rotation_index = nextIndex

          // Reassign to the fairest next person
          await supabase.from('task_assignments').delete().eq('task_id', taskId)
          await supabase.from('task_assignments').insert({
            task_id: taskId,
            user_id: nextUserId,
          })
        }

        await supabase.from('tasks').update(updateData).eq('id', taskId)
      }
    },
    // Optimistic update
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', homeId] })
      const previous = queryClient.getQueryData<Task[]>(['tasks', homeId])

      queryClient.setQueryData<Task[]>(['tasks', homeId], (old) =>
        old?.map((t) => t.id === taskId
          ? { ...t, next_due_date: t.frequency_type === 'once' ? t.next_due_date : new Date(Date.now() + 86400000).toISOString() }
          : t
        ).filter((t) => !(t.id === taskId && t.frequency_type === 'once'))
      )

      return { previous }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      queryClient.invalidateQueries({ queryKey: ['task-history', homeId] })
      queryClient.invalidateQueries({ queryKey: ['summary', homeId] })
      toast.success('¡Tarea completada!')
    },
    onError: (_err, _taskId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', homeId], context.previous)
      }
      toast.error('Error al completar la tarea')
    },
  })

  // Filter tasks
  const filteredTasks = tasks?.filter((task) => {
    // Type filter
    if (filterType === 'task' && task.task_type !== 'task') return false
    if (filterType === 'maintenance' && task.task_type !== 'maintenance') return false

    // Assignee filter
    if (filterAssignee === 'all') { /* pass */ }
    else if (filterAssignee === 'unassigned') { if (task.task_assignments.length > 0) return false }
    else { if (!task.task_assignments.some((a) => a.user_id === filterAssignee)) return false }

    // Date filter
    if (filterDate !== 'all' && task.next_due_date) {
      const dueDate = new Date(task.next_due_date)
      const now = new Date()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      const weekEnd = new Date(now.getTime() + 7 * 86400000)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      if (filterDate === 'today' && dueDate > todayEnd) return false
      if (filterDate === 'week' && dueDate > weekEnd) return false
      if (filterDate === 'month' && dueDate > monthEnd) return false
      if (filterDate === 'overdue' && dueDate >= now) return false
    } else if (filterDate === 'overdue' && !task.next_due_date) {
      return false
    } else if (filterDate !== 'all' && !task.next_due_date) {
      return filterDate !== 'overdue' // tasks without date show in all non-overdue filters
    }

    return true
  })

  // Sort tasks
  const sortedTasks = [...(filteredTasks ?? [])].sort((a, b) => {
    switch (sortBy) {
      case 'title': return a.title.localeCompare(b.title)
      case 'frequency': return a.frequency_type.localeCompare(b.frequency_type)
      case 'date':
      default:
        if (!a.next_due_date && !b.next_due_date) return 0
        if (!a.next_due_date) return 1
        if (!b.next_due_date) return -1
        return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
    }
  })

  if (isLoading) return <p className="text-gray-500">Cargando tareas...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setActiveView('list')} className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${activeView === 'list' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>Tareas activas</button>
        <button onClick={() => setActiveView('history')} className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${activeView === 'history' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>Historial</button>
      </div>

      {activeView === 'history' && <TaskHistory homeId={homeId} members={members ?? []} />}

      {activeView === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tareas ({sortedTasks.length})</h2>
            {currentUserRole !== 'guest' && (
              <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" data-testid="tasks-add-button">+ Nueva Tarea</button>
            )}
          </div>

          {/* Filters + Sort */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type filter */}
              {(['all', 'task', 'maintenance'] as const).map((type) => {
                const labels = { all: 'Todo', task: 'Tareas', maintenance: 'Mantenim.' }
                return (
                  <button key={type} onClick={() => setFilterType(type)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filterType === type ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{labels[type]}</button>
                )
              })}
              <span className="text-gray-300 dark:text-gray-600">|</span>
              {/* Assignee filter */}
              {['all', session!.user.id, 'unassigned'].map((filter, i) => {
                const labels = ['Todas', 'Mías', 'Sin asignar']
                return (
                  <button key={filter} onClick={() => setFilterAssignee(filter)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filterAssignee === filter ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {labels[i]}
                  </button>
                )
              })}
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-gray-500">Fecha:</span>
              {(['all', 'today', 'week', 'month', 'overdue'] as const).map((filter) => {
                const labels: Record<string, string> = { all: 'Todas', today: 'Hoy', week: 'Semana', month: 'Mes', overdue: 'Atrasadas' }
                return (
                  <button key={filter} onClick={() => setFilterDate(filter)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filterDate === filter ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {labels[filter]}
                  </button>
                )
              })}
            </div>
            {/* Sort chips */}
            <div className="flex items-center gap-1">
              {([
                { key: 'date', label: 'Fecha' },
                { key: 'title', label: 'Título' },
                { key: 'frequency', label: 'Frecuencia' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setSortBy(key)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${sortBy === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{label}</button>
              ))}
            </div>
          </div>

          {showForm && (
            <CreateTaskForm homeId={homeId} members={members ?? []} onCreated={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['tasks', homeId] }) }} onCancel={() => setShowForm(false)} />
          )}

          {sortedTasks.length === 0 && !showForm && (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">No hay tareas. ¡Crea la primera!</p>
            </div>
          )}

          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={members ?? []}
                homeId={homeId}
                currentUserId={session!.user.id}
                currentUserRole={currentUserRole ?? 'member'}
                onComplete={() => completeMutation.mutate(task.id)}
                isCompleting={completeMutation.isPending && completeMutation.variables === task.id}
                isEditing={editingTaskId === task.id}
                onStartEdit={() => setEditingTaskId(task.id)}
                onStopEdit={() => setEditingTaskId(null)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TaskHistory({ homeId, members }: { homeId: string; members: Member[] }) {
  const [filterUser, setFilterUser] = useState('')

  const { data: history, isLoading } = useQuery({
    queryKey: ['task-history', homeId, filterUser],
    queryFn: async () => {
      let query = supabase
        .from('task_completions')
        .select('*, tasks!inner(title, home_id), profiles:completed_by(display_name)')
        .eq('tasks.home_id', homeId)
        .order('completed_at', { ascending: false })
        .limit(50)

      if (filterUser) query = query.eq('completed_by', filterUser)
      const { data, error } = await query
      if (error) throw error
      return data as TaskCompletion[]
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando historial...</p>

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Historial de Completaciones</h3>
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => setFilterUser('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!filterUser ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>Todos</button>
        {members.map((m) => (
          <button key={m.user_id} onClick={() => setFilterUser(m.user_id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filterUser === m.user_id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{m.profiles?.display_name}</button>
        ))}
      </div>
      {!history?.length && <p className="text-sm text-gray-500">No hay completaciones registradas.</p>}
      <div className="space-y-1">
        {history?.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{(entry.tasks as any)?.title}</p>
                <p className="text-xs text-gray-500">{(entry.profiles as any)?.display_name} · {new Date(entry.completed_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}</p>
              </div>
            </div>
            {entry.was_overdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Atrasada</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({
  task, members, homeId, currentUserId, currentUserRole, onComplete, isCompleting, isEditing, onStartEdit, onStopEdit,
}: {
  task: Task; members: Member[]; homeId: string; currentUserId: string; currentUserRole: string; onComplete: () => void; isCompleting: boolean; isEditing: boolean; onStartEdit: () => void; onStopEdit: () => void
}) {
  const [showAssignEdit, setShowAssignEdit] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const confirm = useConfirm()

  const isOverdue = task.next_due_date ? new Date(task.next_due_date) < new Date() : false
  const isAssignedToMe = task.task_assignments.some((a) => a.user_id === currentUserId)
  const isGuest = currentUserRole === 'guest'
  const isPaused = !task.next_due_date && task.frequency_type !== 'once'
  const canEdit = !isGuest && (task.created_by === currentUserId || currentUserRole === 'owner' || currentUserRole === 'admin')
  const canComplete = (isGuest ? isAssignedToMe : true) && !isPaused

  const assignedNames = task.task_assignments
    .map((a) => members.find((m) => m.user_id === a.user_id)?.profiles?.display_name)
    .filter(Boolean)

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Eliminar tarea', message: `¿Eliminar "${task.title}"?`, confirmText: 'Eliminar', variant: 'danger' })
    if (!ok) return

    // Optimistic: hide immediately
    queryClient.setQueryData<Task[]>(['tasks', homeId], (old) => old?.filter((t) => t.id !== task.id))

    undoableDelete({
      message: `"${task.title}" eliminada`,
      onConfirm: async () => {
        await supabase.from('tasks').update({ is_active: false }).eq('id', task.id)
        queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      },
      onUndo: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      },
    })
  }

  const handleTogglePause = async () => {
    if (task.next_due_date) {
      // Pausing
      await supabase.from('tasks').update({ next_due_date: null }).eq('id', task.id)
      queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      toast.success('Tarea pausada')
    } else {
      // Reactivating — calculate and show next date
      const nextDue = calculateNextDueDate(
        task.frequency_type as any,
        task.frequency_config as any,
        new Date()
      )
      const nextDate = nextDue ? new Date(nextDue).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'próxima ocurrencia'

      if (!(await confirm({ message: `¿Reactivar tarea?\n\nPróxima fecha: ${nextDate}`, confirmText: 'Reactivar' }))) return

      await supabase.from('tasks').update({ next_due_date: nextDue }).eq('id', task.id)
      queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      toast.success('Tarea reactivada')
    }
  }

  // Maintenance status advancement
  const handleAdvanceStatus = async () => {
    const nextStatusMap: Record<string, string> = { active: 'in_progress', in_progress: 'completed' }
    const next = nextStatusMap[task.status]
    if (!next) return

    const updateData: Record<string, unknown> = { status: next }
    if (next === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = session!.user.id
      updateData.is_active = false
    }
    const { error } = await supabase.from('tasks').update(updateData).eq('id', task.id)
    if (error) { toast.error(error.message); return }
    queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
    toast.success(next === 'completed' ? 'Mantenimiento completado' : 'Mantenimiento iniciado')
  }

  // Photos for maintenance
  const { data: photos } = useQuery({
    queryKey: ['task-photos', task.id],
    enabled: task.task_type === 'maintenance',
    queryFn: async () => {
      const { data, error } = await supabase.from('task_photos').select('*').eq('task_id', task.id).order('created_at', { ascending: false })
      if (error) return []
      return data as { id: string; url: string; caption: string | null }[]
    },
  })

  // Notes for maintenance
  const { data: notes } = useQuery({
    queryKey: ['task-notes', task.id],
    enabled: task.task_type === 'maintenance' && showNotes,
    queryFn: async () => {
      const { data, error } = await supabase.from('task_notes').select('*, profiles:user_id(display_name)').eq('task_id', task.id).order('created_at', { ascending: false })
      if (error) return []
      return data
    },
  })

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    const { error } = await supabase.from('task_notes').insert({ task_id: task.id, user_id: session!.user.id, content: newNote.trim() })
    if (error) { toast.error(error.message); return }
    queryClient.invalidateQueries({ queryKey: ['task-notes', task.id] })
    setNewNote('')
    toast.success('Nota agregada')
  }

  const handleAddPhoto = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const filePath = `${task.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('maintenance-photos').upload(filePath, file)
      if (error) { toast.error('Error subiendo foto'); return }
      const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(filePath)
      await supabase.from('task_photos').insert({ task_id: task.id, user_id: session!.user.id, url: urlData.publicUrl })
      toast.success('Foto agregada')
      queryClient.invalidateQueries({ queryKey: ['task-photos', task.id] })
    }
    input.click()
  }

  const handleUpdateAssignees = async (userIds: string[]) => {
    // If rotation enabled and less than 2 assignees, disable rotation
    if (task.rotation_enabled && userIds.length < 2) {
      await supabase.from('tasks').update({ rotation_enabled: false, rotation_members: [] }).eq('id', task.id)
      toast('Rotación desactivada (se necesitan al menos 2 asignados)', { icon: '!' })
    }

    await supabase.from('task_assignments').delete().eq('task_id', task.id)
    if (userIds.length > 0) {
      await supabase.from('task_assignments').insert(userIds.map((uid) => ({ task_id: task.id, user_id: uid })))
    }
    queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
    setShowAssignEdit(false)
    toast.success('Asignación actualizada')
  }

  if (isEditing) {
    return (
      <EditTaskForm
        task={task}
        members={members}
        homeId={homeId}
        onSaved={() => { onStopEdit(); queryClient.invalidateQueries({ queryKey: ['tasks', homeId] }) }}
        onCancel={onStopEdit}
      />
    )
  }

  return (
    <div className={`rounded-lg border bg-white p-4 transition-all ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{task.title}</h3>
            {task.task_type === 'maintenance' && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900 dark:text-orange-300">Mantenim.</span>}
            {task.priority && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}</span>}
            {task.status === 'in_progress' && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">En progreso</span>}
            {isOverdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Atrasada</span>}
            {isPaused && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">Pausada</span>}
            {task.rotation_enabled && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Rotación</span>}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>{formatFrequencyDisplay(task.frequency_type, task.frequency_config)}</span>
            {task.next_due_date && (
              <span>{new Date(task.next_due_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            )}
            {!task.next_due_date && task.frequency_type === 'once' && (
              <span className="italic text-gray-400">Sin fecha límite</span>
            )}
            <button onClick={() => setShowAssignEdit(!showAssignEdit)} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100">
              {assignedNames.length > 0 ? assignedNames.join(', ') : 'Sin asignar'}
            </button>
            {task.frequency_type !== 'once' && <CompletionCounter taskId={task.id} />}
          </div>
          {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
          {/* Maintenance action buttons */}
          {task.task_type === 'maintenance' && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors">
                <MessageCircle className="h-3.5 w-3.5" /> Notas
              </button>
              <button onClick={handleAddPhoto} className="flex items-center gap-1 rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors">
                <Camera className="h-3.5 w-3.5" /> Foto
              </button>
            </div>
          )}
          <SubtaskList taskId={task.id} members={members} />
          <TaskComments taskId={task.id} />
        </div>

        <div className="ml-4 flex items-center gap-1">
          {canEdit && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={onStartEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                title="Editar tarea"
                aria-label="Editar tarea"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {task.frequency_type !== 'once' && (
                <button
                  onClick={handleTogglePause}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isPaused ? 'text-green-500 hover:bg-green-50 hover:text-green-600' : 'text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'}`}
                  title={isPaused ? 'Reactivar tarea' : 'Pausar tarea'}
                  aria-label={isPaused ? 'Reactivar tarea' : 'Pausar tarea'}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Eliminar tarea"
                aria-label="Eliminar tarea"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          {canComplete && task.task_type !== 'maintenance' && (
            <button
              onClick={async () => {
                if (isOverdue && task.next_due_date) {
                  const hoursOverdue = Math.floor((Date.now() - new Date(task.next_due_date).getTime()) / 3600000)
                  if (hoursOverdue > 24) {
                    const ok = await confirm({ message: `Esta tarea está atrasada por ${hoursOverdue} horas. ¿Completar de todos modos?`, confirmText: 'Completar', variant: 'warning' })
                    if (!ok) return
                  }
                }
                onComplete()
              }}
              disabled={isCompleting}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all ${
                isCompleting
                  ? 'border-gray-300 text-gray-400'
                  : 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-md'
              } disabled:opacity-50`}
              title="Completar tarea"
              data-testid={`task-complete-${task.id}`}
            >
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={3} />}
            </button>
          )}
          {/* Maintenance status advancement */}
          {task.task_type === 'maintenance' && task.status !== 'completed' && (
            <button
              onClick={handleAdvanceStatus}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${task.status === 'active' ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
              title={task.status === 'active' ? 'Iniciar mantenimiento' : 'Completar mantenimiento'}
            >
              {task.status === 'active' ? <Play className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              {task.status === 'active' ? 'Iniciar' : 'Completar'}
            </button>
          )}
        </div>
      </div>

      {/* Inline assignee editor */}
      {showAssignEdit && canEdit && (
        <AssigneeEditor taskId={task.id} members={members} currentAssignees={task.task_assignments.map((a) => a.user_id)} onSave={handleUpdateAssignees} onCancel={() => setShowAssignEdit(false)} />
      )}

      {/* Rotation fairness stats */}
      {task.rotation_enabled && task.rotation_members.length >= 2 && (
        <RotationStats taskId={task.id} rotationMembers={task.rotation_members} currentAssignees={task.task_assignments.map((a) => a.user_id)} homeId={homeId} />
      )}

      {/* Maintenance notes */}
      {task.task_type === 'maintenance' && showNotes && (
        <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Agregar nota..." className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" onKeyDown={(e) => { if (e.key === 'Enter' && newNote.trim()) handleAddNote() }} />
            <button onClick={handleAddNote} disabled={!newNote.trim()} className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50">+</button>
          </div>
          {notes?.map((note: any) => (
            <div key={note.id} className="rounded bg-gray-50 px-2 py-1 text-xs">
              <span className="font-medium text-gray-700">{note.profiles?.display_name}:</span> <span className="text-gray-600">{note.content}</span>
              <span className="ml-2 text-gray-400">{new Date(note.created_at).toLocaleDateString('es-CO')}</span>
            </div>
          ))}
          {notes?.length === 0 && <p className="text-xs text-gray-400">Sin notas aún</p>}
        </div>
      )}

      {/* Maintenance photos */}
      {task.task_type === 'maintenance' && photos && photos.length > 0 && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Fotos ({photos.length})</p>
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo) => <PhotoThumbnail key={photo.id} photo={photo} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function CompletionCounter({ taskId }: { taskId: string }) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: count } = useQuery({
    queryKey: ['task-completion-count', taskId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId)
        .gte('completed_at', monthStart)
      if (error) return 0
      return count ?? 0
    },
    staleTime: 60000,
  })

  if (!count) return null

  return (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700 text-xs">
      ✓ {count}× este mes
    </span>
  )
}

function EditTaskForm({ task, members, homeId, onSaved, onCancel }: {
  task: Task; members: Member[]; homeId: string; onSaved: () => void; onCancel: () => void
}) {
  const config = task.frequency_config as Record<string, any> | null
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [frequencyType, setFrequencyType] = useState(task.frequency_type === 'weekly_custom' ? 'weekly' : task.frequency_type)
  const [selectedDays, setSelectedDays] = useState<number[]>(config?.daysOfWeek ?? [])
  const [dayOfMonth, setDayOfMonth] = useState(config?.dayOfMonth ?? 1)
  const [intervalDays, setIntervalDays] = useState(config?.intervalDays ?? 3)
  const [hour, setHour] = useState(config?.hour ?? 8)
  const [minute, setMinute] = useState(config?.minute ?? 0)
  const [isLoading, setIsLoading] = useState(false)

  const toggleDay = (day: number) => setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day].sort((a, b) => a - b))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('El título no puede estar vacío')
      return
    }
    if ((frequencyType === 'weekly' || frequencyType === 'biweekly') && selectedDays.length === 0) {
      toast.error('Selecciona al menos un día')
      return
    }
    setIsLoading(true)

    let frequencyConfig: Record<string, unknown> | null = null
    let actualFrequencyType = frequencyType

    switch (frequencyType) {
      case 'daily':
        frequencyConfig = { hour, minute }
        break
      case 'weekly':
        actualFrequencyType = 'weekly_custom'
        frequencyConfig = { daysOfWeek: selectedDays, hour, minute }
        break
      case 'biweekly':
        frequencyConfig = { daysOfWeek: selectedDays, hour, minute }
        break
      case 'monthly':
        frequencyConfig = { dayOfMonth, hour, minute }
        break
      case 'custom':
        frequencyConfig = { intervalDays, hour, minute }
        break
    }

    let nextDueDate: string | null = task.next_due_date
    if (frequencyType !== 'once') {
      nextDueDate = calculateNextDueDate(actualFrequencyType as any, frequencyConfig as any, new Date())
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title,
        description: description || null,
        frequency_type: actualFrequencyType,
        frequency_config: frequencyConfig,
        next_due_date: nextDueDate,
      })
      .eq('id', task.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Tarea actualizada')
      onSaved()
    }
    setIsLoading(false)
  }

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-primary-200 bg-primary-50/30 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary-700 uppercase">Editando tarea</p>
      <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" maxLength={200} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} placeholder="Descripción (opcional)" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />

      <div>
        <label className="text-xs text-gray-600 mb-1 block">Frecuencia</label>
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'once', label: 'Una vez' },
            { key: 'daily', label: 'Diaria' },
            { key: 'weekly', label: 'Semanal' },
            { key: 'biweekly', label: 'Quincenal' },
            { key: 'monthly', label: 'Mensual' },
            { key: 'custom', label: 'Cada X días' },
          ] as const).map(({ key, label }) => (
            <button type="button" key={key} onClick={() => setFrequencyType(key)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${frequencyType === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Custom: every X days + time */}
      {frequencyType === 'custom' && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <label className="text-xs text-gray-600">Repetir cada</label>
            <input type="number" min={2} max={365} value={intervalDays} onChange={(e) => setIntervalDays(Math.max(2, Math.min(365, Number(e.target.value) || 2)))} className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-center font-bold" />
            <span className="text-xs text-gray-600">días</span>
          </div>
          <div>
            <label className="text-xs text-gray-600">Hora:</label>
            <div className="mt-1 flex gap-1 items-center">
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
              </select>
              <span className="text-gray-500 font-medium">:</span>
              <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Daily: time */}
      {frequencyType === 'daily' && (
        <div>
          <label className="text-xs text-gray-600">Hora:</label>
          <div className="mt-1 flex gap-1 items-center">
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
            </select>
            <span>:</span>
            <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
              {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Weekly / Biweekly: days + time */}
      {(frequencyType === 'weekly' || frequencyType === 'biweekly') && (
        <div className="space-y-2">
          <label className="text-xs text-gray-600 block">Días:</label>
          <div className="flex gap-1">
            {dayLabels.map((label, idx) => (
              <button key={idx} type="button" onClick={() => toggleDay(idx)} className={`rounded-full w-9 h-9 text-xs font-medium border transition-colors ${selectedDays.includes(idx) ? 'bg-primary-500 border-primary-500 text-white' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}>{label}</button>
            ))}
          </div>
          <div>
            <label className="text-xs text-gray-600">Hora:</label>
            <div className="mt-1 flex gap-1 items-center">
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
              </select>
              <span>:</span>
              <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Monthly: day + time */}
      {frequencyType === 'monthly' && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <label className="text-xs text-gray-600">Día:</label>
            <input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center font-bold" />
            <span className="text-xs text-gray-600">de cada mes</span>
          </div>
          <div>
            <label className="text-xs text-gray-600">Hora:</label>
            <div className="mt-1 flex gap-1 items-center">
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
              </select>
              <span>:</span>
              <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Guardando...' : 'Guardar Cambios'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancelar</button>
      </div>
    </form>
  )
}

function formatFrequencyDisplay(frequencyType: string, config: Record<string, unknown> | null): string {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const h = config?.hour !== undefined ? String(config.hour).padStart(2, '0') : null
  const m = config?.minute !== undefined ? String(config.minute).padStart(2, '0') : null
  const timeStr = h !== null ? ` a las ${h}:${m ?? '00'}` : ''

  switch (frequencyType) {
    case 'once':
      return 'Una vez'
    case 'daily':
      return `Diaria${timeStr}`
    case 'weekly':
    case 'weekly_custom': {
      const days = (config?.daysOfWeek as number[]) ?? []
      const dayStr = days.length > 0 ? days.map((d) => dayNames[d]).join(', ') : 'Sin días'
      return `Semanal: ${dayStr}${timeStr}`
    }
    case 'biweekly': {
      const days = (config?.daysOfWeek as number[]) ?? []
      const dayStr = days.length > 0 ? days.map((d) => dayNames[d]).join(', ') : 'Sin días'
      return `Quincenal: ${dayStr}${timeStr}`
    }
    case 'monthly': {
      const dayOfMonth = config?.dayOfMonth as number | undefined
      return `Mensual: día ${dayOfMonth ?? '?'}${timeStr}`
    }
    case 'custom':
      return `Cada ${config?.intervalDays ?? '?'} días${timeStr}`
    default:
      return frequencyType
  }
}

function AssigneeEditor({ taskId, members, currentAssignees, onSave, onCancel }: {
  taskId: string; members: Member[]; currentAssignees: string[]; onSave: (ids: string[]) => void; onCancel: () => void
}) {
  const [selected, setSelected] = useState<string[]>(currentAssignees)

  const toggle = (uid: string) => {
    setSelected((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid])
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <p className="text-xs font-medium text-gray-700 mb-2">Editar asignados:</p>
      <div className="flex flex-wrap gap-1">
        {members.map((m) => (
          <button key={m.user_id} type="button" onClick={() => toggle(m.user_id)} className={`rounded-full px-3 py-1 text-xs font-medium border ${selected.includes(m.user_id) ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
            {selected.includes(m.user_id) ? '✓ ' : ''}{m.profiles?.display_name ?? '?'}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => onSave(selected)} className="rounded bg-primary-600 px-3 py-1 text-xs text-white">Guardar</button>
        <button onClick={onCancel} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600">Cancelar</button>
      </div>
    </div>
  )
}

function PhotoThumbnail({ photo }: { photo: { id: string; url: string; caption: string | null } }) {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <button onClick={() => setShowModal(true)} className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 hover:border-primary-400 transition-colors">
        <img src={photo.url} alt={photo.caption ?? 'Foto'} className="h-full w-full object-cover" />
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg">✕</button>
            <img src={photo.url} alt={photo.caption ?? 'Foto'} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </>
  )
}

function CreateTaskForm({ homeId, members, onCreated, onCancel }: {
  homeId: string; members: Member[]; onCreated: () => void; onCancel: () => void
}) {
  const { session } = useAuth()
  const [taskType, setTaskType] = useState<'task' | 'maintenance'>('task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [frequencyType, setFrequencyType] = useState('once')
  const [selectedDays, setSelectedDays] = useState<number[]>([1]) // default Monday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [intervalDays, setIntervalDays] = useState(3)
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [rotationEnabled, setRotationEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const toggleAssignee = (uid: string) => setSelectedAssignees((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])
  const toggleDay = (day: number) => setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day].sort((a, b) => a - b))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    // Validation: title not empty/whitespace
    if (!title.trim()) {
      toast.error('El título no puede estar vacío')
      return
    }

    // Validation: date not in the past for one-time tasks
    if (frequencyType === 'once' && dueDate) {
      const selectedDate = new Date(dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        toast.error('La fecha no puede ser en el pasado')
        return
      }
    }

    if ((frequencyType === 'weekly' || frequencyType === 'weekly_custom' || frequencyType === 'biweekly') && selectedDays.length === 0) {
      toast.error('Selecciona al menos un día de la semana')
      return
    }
    if (rotationEnabled && selectedAssignees.length < 2) {
      toast.error('La rotación requiere al menos 2 miembros')
      return
    }
    setIsLoading(true)

    // Build frequency config
    let frequencyConfig: Record<string, unknown> | null = null
    let actualFrequencyType = frequencyType

    switch (frequencyType) {
      case 'daily':
        frequencyConfig = { hour, minute }
        break
      case 'weekly':
      case 'weekly_custom':
        actualFrequencyType = 'weekly_custom' // use weekly_custom in DB for multi-day
        frequencyConfig = { daysOfWeek: selectedDays, hour, minute }
        break
      case 'biweekly':
        frequencyConfig = { daysOfWeek: selectedDays, hour, minute }
        break
      case 'monthly':
        frequencyConfig = { dayOfMonth, hour, minute }
        break
      case 'custom':
        frequencyConfig = { intervalDays, hour, minute }
        break
    }

    // Calculate next due date
    let nextDueDate: string | null = null
    if (frequencyType === 'once') {
      if (dueDate) {
        const d = new Date(dueDate)
        if (dueTime) {
          const [h, m] = dueTime.split(':').map(Number)
          d.setHours(h ?? 0, m ?? 0)
        }
        nextDueDate = d.toISOString()
      }
    } else {
      nextDueDate = calculateNextDueDate(actualFrequencyType as any, frequencyConfig as any, new Date())
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        home_id: homeId, title, description: description || null,
        created_by: session.user.id, frequency_type: actualFrequencyType,
        frequency_config: frequencyConfig, next_due_date: nextDueDate,
        rotation_enabled: rotationEnabled,
        rotation_members: rotationEnabled ? selectedAssignees : [],
        rotation_index: 0,
        task_type: taskType,
        priority: taskType === 'maintenance' ? priority : null,
      })
      .select().single()

    if (error) { toast.error(error.message); setIsLoading(false); return }

    const assignees = rotationEnabled ? [selectedAssignees[0]!] : selectedAssignees
    if (assignees.length > 0) {
      await supabase.from('task_assignments').insert(assignees.map((uid) => ({ task_id: task.id, user_id: uid })))
    }

    toast.success('Tarea creada')
    onCreated()
    setIsLoading(false)
  }

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      {/* Task type selector */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setTaskType('task')} className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${taskType === 'task' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>Tarea</button>
        <button type="button" onClick={() => { setTaskType('maintenance'); setFrequencyType('once') }} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${taskType === 'maintenance' ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}><Wrench className="h-3.5 w-3.5" /> Mantenimiento</button>
      </div>

      <input type="text" required placeholder={taskType === 'maintenance' ? '¿Qué necesita arreglo?' : 'Título de la tarea'} value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" maxLength={200} data-testid="task-form-title" />
      <textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />

      {/* Priority (maintenance only) */}
      {taskType === 'maintenance' && (
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Prioridad</label>
          <div className="flex gap-2">
            {([{ key: 'high', label: 'Alta', color: 'border-red-400 bg-red-50 text-red-700' }, { key: 'medium', label: 'Media', color: 'border-yellow-400 bg-yellow-50 text-yellow-700' }, { key: 'low', label: 'Baja', color: 'border-green-400 bg-green-50 text-green-700' }] as const).map((p) => (
              <button key={p.key} type="button" onClick={() => setPriority(p.key)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${priority === p.key ? p.color + ' shadow-sm' : 'border-gray-300 bg-gray-50 text-gray-600'}`}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Frequency selector (tasks only — maintenance is always 'once') */}
      {taskType === 'task' && (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Frecuencia</label>
          <div className="flex gap-1 flex-wrap">
            {([
              { key: 'once', label: 'Una vez' },
              { key: 'daily', label: 'Diaria' },
              { key: 'weekly', label: 'Semanal' },
              { key: 'biweekly', label: 'Quincenal' },
              { key: 'monthly', label: 'Mensual' },
            ] as const).map(({ key, label }) => (
              <button type="button" key={key} onClick={() => setFrequencyType(key)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${frequencyType === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Once: date + time */}
        {frequencyType === 'once' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Fecha (opcional)</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Hora (opcional)</label>
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {/* Daily: just time */}
        {frequencyType === 'daily' && (
          <div className="max-w-[200px]">
            <label className="text-xs text-gray-600">Hora de la tarea</label>
            <div className="mt-1 flex gap-1 items-center">
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
              </select>
              <span className="text-gray-500">:</span>
              <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Weekly / Biweekly: days + time */}
        {(frequencyType === 'weekly' || frequencyType === 'biweekly') && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                {frequencyType === 'weekly' ? 'Se repite cada semana los días:' : 'Se repite cada 2 semanas los días:'}
              </label>
              <div className="flex gap-1">
                {dayLabels.map((label, idx) => (
                  <button key={idx} type="button" onClick={() => toggleDay(idx)} className={`rounded-full w-9 h-9 text-xs font-medium border transition-colors ${selectedDays.includes(idx) ? 'bg-primary-500 border-primary-500 text-white' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="max-w-[200px]">
              <label className="text-xs text-gray-600">Hora</label>
              <div className="mt-1 flex gap-1 items-center">
                <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                </select>
                <span className="text-gray-500">:</span>
                <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm">
                  {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Monthly: day of month + time */}
        {frequencyType === 'monthly' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Se repite cada mes el día:</label>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(31, Number(e.target.value) || 1))
                    setDayOfMonth(v)
                  }}
                  className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">de cada mes</span>
              </div>
              {dayOfMonth > 28 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  En meses más cortos se usará el último día disponible
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">A las:</label>
              <div className="flex gap-1 items-center">
                <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                </select>
                <span className="text-gray-500 font-medium">:</span>
                <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Date for maintenance */}
      {taskType === 'maintenance' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">Fecha estimada (opcional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Hora (opcional)</label>
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {/* Assignees */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">Asignar a:</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button key={m.user_id} type="button" onClick={() => toggleAssignee(m.user_id)} className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedAssignees.includes(m.user_id) ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
              {selectedAssignees.includes(m.user_id) ? '✓ ' : ''}{m.profiles?.display_name ?? '?'}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation */}
      {selectedAssignees.length >= 2 && frequencyType !== 'once' && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} className="rounded border-gray-300" />
          Rotar responsables automáticamente
        </label>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={isLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" data-testid="task-form-submit">{isLoading ? 'Creando...' : taskType === 'maintenance' ? 'Registrar Mantenimiento' : 'Crear Tarea'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancelar</button>
      </div>
    </form>
  )
}
