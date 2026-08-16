import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/AuthProvider'

export default function HomeTab() {
  const { session } = useAuth()

  const { data: homes } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('home_members')
        .select('homes(id, name)')
        .eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  const homeId = homes?.[0]?.id

  const { data: tasks } = useQuery({
    queryKey: ['tasks-upcoming', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, next_due_date, task_type')
        .eq('home_id', homeId!)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .order('next_due_date', { ascending: true })
        .limit(8)
      return data ?? []
    },
  })

  const handleComplete = async (taskId: string) => {
    await supabase.from('task_completions').insert({ task_id: taskId, completed_by: session!.user.id, was_overdue: false })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hola, {session?.user.email?.split('@')[0]}</Text>

      {homes && homes.length > 0 && (
        <Text style={styles.homeName}>{homes[0].name}</Text>
      )}

      <Text style={styles.sectionTitle}>Próximas actividades</Text>

      {tasks && tasks.length > 0 ? (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isOverdue = new Date(item.next_due_date) < new Date()
            return (
              <View style={[styles.taskCard, isOverdue && styles.taskCardOverdue]}>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, isOverdue && styles.taskTitleOverdue]}>{item.title}</Text>
                  <Text style={styles.taskDate}>
                    {new Date(item.next_due_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => handleComplete(item.id)}
                >
                  <Text style={styles.completeBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
            )
          }}
          contentContainerStyle={{ gap: 8 }}
        />
      ) : (
        <Text style={styles.empty}>Sin actividades pendientes</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  greeting: { fontSize: 16, color: '#6b7280', marginBottom: 4 },
  homeName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskCardOverdue: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  taskTitleOverdue: { color: '#dc2626' },
  taskDate: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnText: { fontSize: 16, color: '#059669', fontWeight: '700' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 32 },
})
