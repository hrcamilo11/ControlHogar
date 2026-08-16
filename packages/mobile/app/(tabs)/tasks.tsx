import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/AuthProvider'

type FilterType = 'all' | 'task' | 'maintenance'

export default function TasksTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data: homes } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('homes(id, name)').eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  const homeId = homes?.[0]?.id

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', homeId, filterType],
    enabled: !!homeId,
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('id, title, task_type, priority, status, next_due_date, frequency_type')
        .eq('home_id', homeId!)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true, nullsFirst: false })

      if (filterType === 'task') query = query.eq('task_type', 'task')
      if (filterType === 'maintenance') query = query.eq('task_type', 'maintenance')

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  const handleComplete = async (taskId: string) => {
    await supabase.from('task_completions').insert({ task_id: taskId, completed_by: session!.user.id, was_overdue: false })
    queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
  }

  const handleAdd = async () => {
    if (!newTitle.trim() || !homeId) return
    const { error } = await supabase.from('tasks').insert({
      home_id: homeId,
      title: newTitle.trim(),
      created_by: session!.user.id,
      frequency_type: 'once',
    })
    if (error) Alert.alert('Error', error.message)
    else {
      setNewTitle('')
      setShowAdd(false)
      queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
    }
  }

  const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'task', 'maintenance'] as const).map((type) => {
          const labels = { all: 'Todo', task: 'Tareas', maintenance: 'Mantenim.' }
          return (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              style={[styles.chip, filterType === type && styles.chipActive]}
            >
              <Text style={[styles.chipText, filterType === type && styles.chipTextActive]}>{labels[type]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Add button */}
      {showAdd ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="Título de la actividad"
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            onSubmitEditing={handleAdd}
          />
          <View style={styles.addActions}>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Crear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.newBtnText}>+ Nueva actividad</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOverdue = item.next_due_date && new Date(item.next_due_date) < new Date()
          return (
            <View style={[styles.card, isOverdue && styles.cardOverdue]}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.task_type === 'maintenance' && (
                    <View style={styles.badge}><Text style={styles.badgeText}>Mant.</Text></View>
                  )}
                  {item.priority && (
                    <View style={[styles.dot, { backgroundColor: priorityColors[item.priority] }]} />
                  )}
                </View>
                <Text style={styles.cardMeta}>
                  {item.next_due_date
                    ? new Date(item.next_due_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
                    : 'Sin fecha'}
                </Text>
              </View>
              {item.task_type === 'task' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item.id)}>
                  <Text style={styles.completeBtnText}>✓</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }}
        contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        ListEmptyComponent={
          isLoading ? null : <Text style={styles.empty}>No hay actividades</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#ffffff' },
  newBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  newBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  addForm: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  addInput: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 12, marginBottom: 12 },
  addActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  cancelText: { color: '#6b7280', fontSize: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cardOverdue: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#111827', flex: 1 },
  badge: { backgroundColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#9a3412' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  completeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#34d399', alignItems: 'center', justifyContent: 'center' },
  completeBtnText: { fontSize: 16, color: '#059669', fontWeight: '700' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 },
})
