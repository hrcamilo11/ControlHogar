import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface RotationStats {
  userId: string
  displayName: string
  completions: number
  isCurrentAssignee: boolean
}

/**
 * Shows rotation fairness stats for a task.
 * Displays how many times each member has completed the task.
 */
export function RotationStats({ taskId, rotationMembers, currentAssignees, homeId }: {
  taskId: string
  rotationMembers: string[]
  currentAssignees: string[]
  homeId: string
}) {
  const { data: stats } = useQuery({
    queryKey: ['rotation-stats', taskId],
    queryFn: async () => {
      // Get completions per member for this task
      const { data: completions } = await supabase
        .from('task_completions')
        .select('completed_by')
        .eq('task_id', taskId)

      // Get member names
      const { data: members } = await supabase
        .from('home_members')
        .select('user_id, profiles(display_name)')
        .eq('home_id', homeId)
        .in('user_id', rotationMembers)

      // Count completions per member
      const counts: Record<string, number> = {}
      for (const uid of rotationMembers) {
        counts[uid] = 0
      }
      for (const c of completions ?? []) {
        if (counts[c.completed_by] !== undefined) {
          counts[c.completed_by]!++
        }
      }

      const memberMap = new Map(
        (members ?? []).map((m: any) => [m.user_id, (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.display_name ?? '?'])
      )

      return rotationMembers.map((uid) => ({
        userId: uid,
        displayName: memberMap.get(uid) ?? '?',
        completions: counts[uid] ?? 0,
        isCurrentAssignee: currentAssignees.includes(uid),
      })) as RotationStats[]
    },
    staleTime: 30000,
  })

  if (!stats || stats.length === 0) return null

  const maxCompletions = Math.max(...stats.map((s) => s.completions), 1)
  const minCompletions = Math.min(...stats.map((s) => s.completions))
  const isUnbalanced = maxCompletions - minCompletions > 2

  return (
    <div className="mt-2 rounded-lg bg-purple-50 border border-purple-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-purple-700">Rotación equitativa</p>
        {isUnbalanced && <span className="text-xs text-amber-600">Desbalanceada</span>}
      </div>
      <div className="space-y-1">
        {stats.map((s) => (
          <div key={s.userId} className="flex items-center gap-2">
            <span className={`text-xs w-20 truncate ${s.isCurrentAssignee ? 'font-bold text-purple-800' : 'text-gray-600'}`}>
              {s.isCurrentAssignee ? '→ ' : ''}{s.displayName}
            </span>
            <div className="flex-1 h-2 rounded-full bg-purple-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${s.isCurrentAssignee ? 'bg-purple-600' : 'bg-purple-300'}`}
                style={{ width: `${maxCompletions > 0 ? (s.completions / maxCompletions) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-6 text-right">{s.completions}×</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Calculate who should be assigned next based on fairness (least completions first).
 * Falls back to sequential rotation if completions are equal.
 */
export function getNextFairAssignee(
  rotationMembers: string[],
  currentIndex: number,
  completionCounts: Record<string, number>,
): { nextUserId: string; nextIndex: number } {
  if (rotationMembers.length === 0) {
    return { nextUserId: '', nextIndex: 0 }
  }

  // Find the member with the least completions
  let minCount = Infinity
  let minUserId = rotationMembers[0]!
  let minIndex = 0

  for (let i = 0; i < rotationMembers.length; i++) {
    const uid = rotationMembers[i]!
    const count = completionCounts[uid] ?? 0
    if (count < minCount) {
      minCount = count
      minUserId = uid
      minIndex = i
    }
  }

  // If all have the same count, use sequential (next after current)
  const allSameCount = rotationMembers.every(
    (uid) => (completionCounts[uid] ?? 0) === minCount
  )

  if (allSameCount) {
    const nextIndex = (currentIndex + 1) % rotationMembers.length
    return { nextUserId: rotationMembers[nextIndex]!, nextIndex }
  }

  return { nextUserId: minUserId, nextIndex: minIndex }
}
