import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Comment {
  id: string
  content: string
  user_id: string
  created_at: string
  profiles: { display_name: string } | null
}

export function TaskComments({ taskId }: { taskId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [newComment, setNewComment] = useState('')

  const { data: comments } = useQuery({
    queryKey: ['task-comments', taskId],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, profiles:user_id(display_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Comment[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: session!.user.id,
        content: newComment.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] })
      setNewComment('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_comments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] }),
  })

  const commentCount = comments?.length ?? 0

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors"
      >
        <MessageCircle className="h-3 w-3" />
        {commentCount > 0 ? `${commentCount} comentario${commentCount > 1 ? 's' : ''}` : 'Comentar'}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
          {/* Comments list */}
          {comments?.map((comment) => (
            <div key={comment.id} className="group flex items-start gap-2">
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600">
                {comment.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium text-gray-700">{comment.profiles?.display_name}</span>{' '}
                  <span className="text-gray-600">{comment.content}</span>
                </p>
                <p className="text-[10px] text-gray-400">
                  {new Date(comment.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {comment.user_id === session?.user.id && (
                <button onClick={() => deleteMutation.mutate(comment.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add comment */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && newComment.trim()) addMutation.mutate() }}
            />
            <button
              onClick={() => { if (newComment.trim()) addMutation.mutate() }}
              disabled={!newComment.trim() || addMutation.isPending}
              className="rounded-lg bg-primary-600 p-1.5 text-white disabled:opacity-50 hover:bg-primary-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
