import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Plus, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Subtask {
  id: string
  title: string
  is_completed: boolean
  completed_by: string | null
  sort_order: number
}

export function SubtaskList({ taskId }: { taskId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const { data: subtasks } = useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data as Subtask[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const maxOrder = Math.max(0, ...(subtasks ?? []).map((s) => s.sort_order))
      const { error } = await supabase.from('subtasks').insert({
        task_id: taskId,
        title,
        sort_order: maxOrder + 1,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] })
      setNewTitle('')
      setIsAdding(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const updateData: Record<string, unknown> = {
        is_completed: !isCompleted,
        completed_by: !isCompleted ? session!.user.id : null,
        completed_at: !isCompleted ? new Date().toISOString() : null,
      }
      const { error } = await supabase.from('subtasks').update(updateData).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] }),
  })

  const completedCount = subtasks?.filter((s) => s.is_completed).length ?? 0
  const totalCount = subtasks?.length ?? 0

  if (totalCount === 0 && !isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors mt-1"
      >
        <Plus className="h-3 w-3" /> Agregar checklist
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{completedCount}/{totalCount}</span>
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-0.5">
        {subtasks?.map((subtask) => (
          <div key={subtask.id} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50">
            <button
              onClick={() => toggleMutation.mutate({ id: subtask.id, isCompleted: subtask.is_completed })}
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                subtask.is_completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              {subtask.is_completed && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span className={`flex-1 text-xs ${subtask.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {subtask.title}
            </span>
            <button
              onClick={() => deleteMutation.mutate(subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask */}
      {isAdding ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nuevo item..."
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) addMutation.mutate(newTitle.trim())
              if (e.key === 'Escape') { setIsAdding(false); setNewTitle('') }
            }}
            autoFocus
          />
          <button
            onClick={() => { if (newTitle.trim()) addMutation.mutate(newTitle.trim()) }}
            disabled={!newTitle.trim()}
            className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors"
        >
          <Plus className="h-3 w-3" /> Agregar item
        </button>
      )}
    </div>
  )
}
