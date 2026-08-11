import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

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

export function TasksPanel({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

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
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('No autenticado')

      const task = tasks?.find((t) => t.id === taskId)
      const wasOverdue = task?.next_due_date ? new Date(task.next_due_date) < new Date() : false

      // Create completion
      await supabase.from('task_completions').insert({
        task_id: taskId,
        completed_by: session.session.user.id,
        due_date: task?.next_due_date ?? null,
        was_overdue: wasOverdue,
      })

      // If one-time, archive
      if (task?.frequency_type === 'once') {
        await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
      } else {
        // Recalculate next due date (simplified — server trigger should handle this ideally)
        const nextDue = calculateSimpleNextDue(task?.frequency_type ?? 'daily')
        await supabase.from('tasks').update({ next_due_date: nextDue }).eq('id', taskId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
      toast.success('¡Tarea completada!')
    },
    onError: () => {
      toast.error('Error al completar la tarea')
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando tareas...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Tareas ({tasks?.length ?? 0})
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          data-testid="tasks-add-button"
        >
          + Nueva Tarea
        </button>
      </div>

      {showForm && (
        <CreateTaskForm
          homeId={homeId}
          onCreated={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {tasks?.length === 0 && !showForm && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No hay tareas aún. ¡Crea la primera!</p>
        </div>
      )}

      <div className="space-y-2">
        {tasks?.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={() => completeMutation.mutate(task.id)}
            isCompleting={completeMutation.isPending}
          />
        ))}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onComplete,
  isCompleting,
}: {
  task: Task
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

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tasks').update({ is_active: false }).eq('id', task.id)
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    toast.success('Tarea eliminada')
  }

  const handleEdit = async () => {
    if (!editTitle.trim()) return
    await supabase.from('tasks').update({ title: editTitle }).eq('id', task.id)
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
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
    <div
      className={`flex items-center justify-between rounded-lg border bg-white p-4 ${
        isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
      }`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          {isOverdue && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Atrasada
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{frequencyLabels[task.frequency_type] ?? task.frequency_type}</span>
          {task.next_due_date && (
            <span>
              📅 {new Date(task.next_due_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {task.description && (
          <p className="mt-1 text-sm text-gray-600">{task.description}</p>
        )}
      </div>

      <div className="ml-4 flex items-center gap-2">
        <button
          onClick={() => setShowEdit(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
          title="Editar"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          className="text-xs text-gray-400 hover:text-red-600"
          title="Eliminar"
        >
          🗑️
        </button>
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
  onCreated,
  onCancel,
}: {
  homeId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequencyType, setFrequencyType] = useState('once')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    const nextDueDate = frequencyType === 'once' ? null : calculateSimpleNextDue(frequencyType)

    const { error } = await supabase.from('tasks').insert({
      home_id: homeId,
      title,
      description: description || null,
      created_by: session.session.user.id,
      frequency_type: frequencyType,
      next_due_date: nextDueDate,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Tarea creada')
      onCreated()
    }

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
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'biweekly':
      now.setDate(now.getDate() + 14)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    default:
      now.setDate(now.getDate() + 1)
  }
  return now.toISOString()
}
