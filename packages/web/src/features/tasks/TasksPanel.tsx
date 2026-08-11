import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'

interface Task {
  id: string
  title: string
  description: string | null
  frequency_type: string
  next_due_date: string | null
  is_active: boolean
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
  profiles: { display_name: string } | null
}

export function TasksPanel({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState<'list' | 'history'>('list')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_members')
        .select('user_id, profiles(display_name)')
        .eq('home_id', homeId)
      if (error) throw error
      return data as Member[]
    },
  })

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
      const wasOverdue = task?.next_due_date ? new Date(task.next_due_date) < new Date() : false

      await supabase.from('task_completions').insert({
        task_id: taskId,
        completed_by: session!.user.id,
        due_date: task?.next_due_date ?? null,
        was_overdue: wasOverdue,
      })

      if (task?.frequency_type === 'once') {
        await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
      } else {
        const nextDue = calculateSimpleNextDue(task?.frequency_type ?? 'daily')
        await supabase.from('tasks').update({ next_due_date: nextDue }).eq('id', taskId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      queryClient.invalidateQueries({ queryKey: ['task-history', homeId] })
      toast.success('¡Tarea completada!')
    },
    onError: () => toast.error('Error al completar la tarea'),
  })

  // Filter tasks by assignee
  const filteredTasks = tasks?.filter((task) => {
    if (filterAssignee === 'all') return true
    if (filterAssignee === 'unassigned') return task.task_assignments.length === 0
    return task.task_assignments.some((a) => a.user_id === filterAssignee)
  })

  if (isLoading) return <p className="text-gray-500">Cargando tareas...</p>

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveView('list')}
          className={`text-sm font-medium ${activeView === 'list' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          Tareas activas
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`text-sm font-medium ${activeView === 'history' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          📜 Historial
        </button>
      </div>

      {activeView === 'history' && <TaskHistory homeId={homeId} />}

      {activeView === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Tareas ({filteredTasks?.length ?? 0})
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              data-testid="tasks-add-button"
            >
              + Nueva Tarea
            </button>
          </div>

          {/* Filter by assignee */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Filtrar:</span>
            <button
              onClick={() => setFilterAssignee('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filterAssignee === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterAssignee(session!.user.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filterAssignee === session!.user.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Mis tareas
            </button>
            <button
              onClick={() => setFilterAssignee('unassigned')}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filterAssignee === 'unassigned' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Sin asignar
            </button>
          </div>

          {showForm && (
            <CreateTaskForm
              homeId={homeId}
              members={members ?? []}
              onCreated={() => {
                setShowForm(false)
                queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {filteredTasks?.length === 0 && !showForm && (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">No hay tareas. ¡Crea la primera!</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredTasks?.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={members ?? []}
                homeId={homeId}
                onComplete={() => completeMutation.mutate(task.id)}
                isCompleting={completeMutation.isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TaskHistory({ homeId }: { homeId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['task-history', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_completions')
        .select('*, tasks!inner(title, home_id), profiles:completed_by(display_name)')
        .eq('tasks.home_id', homeId)
        .order('completed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as TaskCompletion[]
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando historial...</p>

  if (!history?.length) {
    return <p className="text-sm text-gray-500">No hay completaciones registradas aún.</p>
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900">Historial de Completaciones</h3>
      <div className="space-y-1">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{(entry.tasks as any)?.title}</p>
                <p className="text-xs text-gray-500">
                  {(entry.profiles as any)?.display_name} · {new Date(entry.completed_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            {entry.was_overdue && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Atrasada</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  members,
  homeId,
  onComplete,
  isCompleting,
}: {
  task: Task
  members: Member[]
  homeId: string
  onComplete: () => void
  isCompleting: boolean
}) {
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const queryClient = useQueryClient()
  const isOverdue = task.next_due_date ? new Date(task.next_due_date) < new Date() : false

  const frequencyLabels: Record<string, string> = {
    once: '🔹 Una vez',
    daily: '🔄 Diaria',
    weekly: '📅 Semanal',
    biweekly: '📅 Quincenal',
    monthly: '📅 Mensual',
    custom: '⚙️ Personalizada',
  }

  const assignedNames = task.task_assignments
    .map((a) => members.find((m) => m.user_id === a.user_id)?.profiles?.display_name)
    .filter(Boolean)

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tasks').update({ is_active: false }).eq('id', task.id)
    queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
    toast.success('Tarea eliminada')
  }

  const handleEdit = async () => {
    if (!editTitle.trim()) return
    await supabase.from('tasks').update({ title: editTitle }).eq('id', task.id)
    queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
    setShowEdit(false)
    toast.success('Tarea actualizada')
  }

  if (showEdit) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary-300 bg-white p-4">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
          onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setShowEdit(false) }}
          autoFocus
        />
        <button onClick={handleEdit} className="text-sm text-primary-600 font-medium">Guardar</button>
        <button onClick={() => setShowEdit(false)} className="text-sm text-gray-500">Cancelar</button>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border bg-white p-4 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          {isOverdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Atrasada</span>}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span>{frequencyLabels[task.frequency_type] ?? task.frequency_type}</span>
          {task.next_due_date && (
            <span>📅 {new Date(task.next_due_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          )}
          {assignedNames.length > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
              👤 {assignedNames.join(', ')}
            </span>
          )}
          {assignedNames.length === 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">Sin asignar</span>
          )}
        </div>
        {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
      </div>

      <div className="ml-4 flex items-center gap-2">
        <button onClick={() => setShowEdit(true)} className="text-xs text-gray-400 hover:text-gray-600" title="Editar">✏️</button>
        <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-600" title="Eliminar">🗑️</button>
        <button
          onClick={onComplete}
          disabled={isCompleting}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-green-400 text-green-600 hover:bg-green-50 disabled:opacity-50"
          title="Completar tarea"
          data-testid={`task-complete-${task.id}`}
        >
          ✓
        </button>
      </div>
    </div>
  )
}

function CreateTaskForm({
  homeId,
  members,
  onCreated,
  onCancel,
}: {
  homeId: string
  members: Member[]
  onCreated: () => void
  onCancel: () => void
}) {
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequencyType, setFrequencyType] = useState('once')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setIsLoading(true)

    const nextDueDate = frequencyType === 'once' ? null : calculateSimpleNextDue(frequencyType)

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        home_id: homeId,
        title,
        description: description || null,
        created_by: session.user.id,
        frequency_type: frequencyType,
        next_due_date: nextDueDate,
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    // Create assignments
    if (selectedAssignees.length > 0) {
      const assignments = selectedAssignees.map((userId) => ({
        task_id: task.id,
        user_id: userId,
      }))
      await supabase.from('task_assignments').insert(assignments)
    }

    toast.success('Tarea creada')
    onCreated()
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <input
        type="text"
        required
        placeholder="Título de la tarea"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="task-form-title"
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="task-form-description"
      />
      <select
        value={frequencyType}
        onChange={(e) => setFrequencyType(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        data-testid="task-form-frequency"
      >
        <option value="once">Una vez</option>
        <option value="daily">Diaria</option>
        <option value="weekly">Semanal</option>
        <option value="biweekly">Quincenal</option>
        <option value="monthly">Mensual</option>
      </select>

      {/* Assignee selector */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">Asignar a:</p>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member.user_id}
              type="button"
              onClick={() => toggleAssignee(member.user_id)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                selectedAssignees.includes(member.user_id)
                  ? 'bg-primary-100 border-primary-400 text-primary-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {selectedAssignees.includes(member.user_id) ? '✓ ' : ''}{member.profiles?.display_name ?? 'Sin nombre'}
            </button>
          ))}
        </div>
        {selectedAssignees.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">Sin asignar — cualquier miembro podrá completarla</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          data-testid="task-form-submit"
        >
          {isLoading ? 'Creando...' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function calculateSimpleNextDue(frequencyType: string): string {
  const now = new Date()
  switch (frequencyType) {
    case 'daily': now.setDate(now.getDate() + 1); break
    case 'weekly': now.setDate(now.getDate() + 7); break
    case 'biweekly': now.setDate(now.getDate() + 14); break
    case 'monthly': now.setDate(1); now.setMonth(now.getMonth() + 1); break
    default: now.setDate(now.getDate() + 1)
  }
  return now.toISOString()
}
