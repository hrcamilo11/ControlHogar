import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/AuthProvider'

type FilterType = 'all' | 'task' | 'maintenance'
type TaskType = 'task' | 'maintenance'
type Frequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
type Priority = 'high' | 'medium' | 'low'

export default function TasksTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showAdd, setShowAdd] = useState(false)

  const { data: homes } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('homes(id, name)').eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  const homeId = homes?.[0]?.id

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('user_id, profiles(display_name)').eq('home_id', homeId!)
      return (data ?? []).map((m: any) => ({ user_id: m.user_id, name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.display_name ?? '?' }))
    },
  })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', homeId, filterType],
    enabled: !!homeId,
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('id, title, task_type, priority, status, next_due_date, frequency_type, task_assignments(user_id)')
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

  const handleAdvanceStatus = async (taskId: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'in_progress' : 'completed'
    const updateData: Record<string, unknown> = { status: next }
    if (next === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = session!.user.id
      updateData.is_active = false
    }
    await supabase.from('tasks').update(updateData).eq('id', taskId)
    queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
  }

  const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

  if (showAdd && homeId) {
    return (
      <CreateTaskForm
        homeId={homeId}
        members={members ?? []}
        userId={session!.user.id}
        onCreated={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ['tasks', homeId] }) }}
        onCancel={() => setShowAdd(false)}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'task', 'maintenance'] as const).map((type) => {
          const labels = { all: 'Todo', task: 'Tareas', maintenance: 'Mantenim.' }
          return (
            <TouchableOpacity key={type} onPress={() => setFilterType(type)} style={[styles.chip, filterType === type && styles.chipActive]}>
              <Text style={[styles.chipText, filterType === type && styles.chipTextActive]}>{labels[type]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.newBtnText}>+ Nueva actividad</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOverdue = item.next_due_date && new Date(item.next_due_date) < new Date()
          const assignedNames = (item.task_assignments ?? []).map((a: any) => members?.find((m) => m.user_id === a.user_id)?.name).filter(Boolean)
          return (
            <View style={[styles.card, isOverdue && styles.cardOverdue]}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {item.task_type === 'maintenance' && <View style={styles.badge}><Text style={styles.badgeText}>Mant.</Text></View>}
                  {item.priority && <View style={[styles.dot, { backgroundColor: priorityColors[item.priority] }]} />}
                </View>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta}>
                    {item.next_due_date ? new Date(item.next_due_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha'}
                  </Text>
                  {assignedNames.length > 0 && <Text style={styles.cardAssignee}>{assignedNames.join(', ')}</Text>}
                </View>
              </View>
              {item.task_type === 'task' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item.id)}>
                  <Text style={styles.completeBtnText}>✓</Text>
                </TouchableOpacity>
              )}
              {item.task_type === 'maintenance' && item.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.statusBtn, item.status === 'active' ? styles.statusBtnBlue : styles.statusBtnGreen]}
                  onPress={() => handleAdvanceStatus(item.id, item.status)}
                >
                  <Text style={styles.statusBtnText}>{item.status === 'active' ? 'Iniciar' : 'Completar'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }}
        contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        ListEmptyComponent={isLoading ? null : <Text style={styles.empty}>No hay actividades</Text>}
      />
    </View>
  )
}

function CreateTaskForm({ homeId, members, userId, onCreated, onCancel }: {
  homeId: string; members: { user_id: string; name: string }[]; userId: string; onCreated: () => void; onCancel: () => void
}) {
  const [taskType, setTaskType] = useState<TaskType>('task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('once')
  const [priority, setPriority] = useState<Priority>('medium')
  const [selectedDays, setSelectedDays] = useState<number[]>([1]) // Monday default
  const [dayOfMonth, setDayOfMonth] = useState('15')
  const [hour, setHour] = useState('8')
  const [minute, setMinute] = useState('0')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [rotationStrategy, setRotationStrategy] = useState<'none' | 'fair' | 'round_robin'>('none')
  const [excludedDays, setExcludedDays] = useState<Record<string, number[]>>({})
  const [isLoading, setIsLoading] = useState(false)

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])
  }

  const toggleDay = (day: number) => {
    setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day].sort((a, b) => a - b))
  }

  const toggleExcludedDay = (uid: string, day: number) => {
    setExcludedDays((prev) => {
      const current = prev[uid] ?? []
      const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
      return { ...prev, [uid]: next }
    })
  }

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Error', 'El título es obligatorio'); return }
    if ((frequency === 'weekly' || frequency === 'biweekly') && selectedDays.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día'); return
    }
    setIsLoading(true)

    // Build frequency config
    let frequencyConfig: Record<string, unknown> | null = null
    let actualFrequency = frequency

    const h = parseInt(hour) || 8
    const m = parseInt(minute) || 0

    if (taskType === 'task') {
      switch (frequency) {
        case 'daily': frequencyConfig = { hour: h, minute: m }; break
        case 'weekly':
          actualFrequency = 'weekly_custom' as any
          frequencyConfig = { daysOfWeek: selectedDays, hour: h, minute: m }; break
        case 'biweekly': frequencyConfig = { daysOfWeek: selectedDays, hour: h, minute: m }; break
        case 'monthly': frequencyConfig = { dayOfMonth: parseInt(dayOfMonth) || 1, hour: h, minute: m }; break
      }
    }

    const { data: task, error } = await supabase.from('tasks').insert({
      home_id: homeId,
      title: title.trim(),
      description: description.trim() || null,
      created_by: userId,
      task_type: taskType,
      frequency_type: taskType === 'maintenance' ? 'once' : actualFrequency,
      frequency_config: frequencyConfig,
      priority: taskType === 'maintenance' ? priority : null,
      rotation_strategy: rotationStrategy,
      rotation_pool: rotationStrategy !== 'none'
        ? selectedAssignees.map((uid) => ({ user_id: uid, excluded_days: excludedDays[uid] ?? [] }))
        : [],
      rotation_enabled: rotationStrategy !== 'none',
      rotation_members: rotationStrategy !== 'none' ? selectedAssignees : [],
    }).select().single()

    if (error) { Alert.alert('Error', error.message); setIsLoading(false); return }

    if (selectedAssignees.length > 0 && task) {
      const assignees = rotationStrategy !== 'none' ? [selectedAssignees[0]!] : selectedAssignees
      await supabase.from('task_assignments').insert(assignees.map((uid) => ({ task_id: task.id, user_id: uid })))
    }

    setIsLoading(false)
    onCreated()
  }

  const dayLabels = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S']

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Nueva actividad</Text>

        {/* Type selector */}
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity onPress={() => setTaskType('task')} style={[styles.chip, taskType === 'task' && styles.chipActive]}>
            <Text style={[styles.chipText, taskType === 'task' && styles.chipTextActive]}>Tarea</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setTaskType('maintenance'); setFrequency('once') }} style={[styles.chip, taskType === 'maintenance' && styles.chipOrange]}>
            <Text style={[styles.chipText, taskType === 'maintenance' && styles.chipTextActive]}>Mantenimiento</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder={taskType === 'maintenance' ? '¿Qué necesita arreglo?' : 'Título de la actividad'}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />

        {/* Description */}
        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Detalles adicionales..."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
        />

        {/* Frequency (tasks only) */}
        {taskType === 'task' && (
          <>
            <Text style={styles.label}>Frecuencia</Text>
            <View style={styles.chipRow}>
              {([
                { key: 'once', label: 'Una vez' },
                { key: 'daily', label: 'Diaria' },
                { key: 'weekly', label: 'Semanal' },
                { key: 'biweekly', label: 'Quincenal' },
                { key: 'monthly', label: 'Mensual' },
              ] as const).map(({ key, label }) => (
                <TouchableOpacity key={key} onPress={() => setFrequency(key)} style={[styles.chip, frequency === key && styles.chipActive]}>
                  <Text style={[styles.chipText, frequency === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Days of week (weekly/biweekly) */}
            {(frequency === 'weekly' || frequency === 'biweekly') && (
              <>
                <Text style={styles.label}>Días</Text>
                <View style={styles.chipRow}>
                  {dayLabels.map((label, idx) => (
                    <TouchableOpacity key={idx} onPress={() => toggleDay(idx)} style={[styles.dayBtn, selectedDays.includes(idx) && styles.dayBtnActive]}>
                      <Text style={[styles.dayBtnText, selectedDays.includes(idx) && styles.dayBtnTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Day of month (monthly) */}
            {frequency === 'monthly' && (
              <>
                <Text style={styles.label}>Día del mes</Text>
                <TextInput style={[styles.input, { width: 80 }]} value={dayOfMonth} onChangeText={setDayOfMonth} keyboardType="numeric" maxLength={2} />
                {parseInt(dayOfMonth) > 28 && <Text style={styles.hint}>En meses cortos se usará el último día</Text>}
              </>
            )}

            {/* Time (for recurring) */}
            {frequency !== 'once' && (
              <>
                <Text style={styles.label}>Hora</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TextInput style={[styles.input, { width: 60, marginBottom: 0, textAlign: 'center' }]} value={hour} onChangeText={setHour} keyboardType="numeric" maxLength={2} placeholder="HH" />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#6b7280' }}>:</Text>
                  <TextInput style={[styles.input, { width: 60, marginBottom: 0, textAlign: 'center' }]} value={minute} onChangeText={setMinute} keyboardType="numeric" maxLength={2} placeholder="MM" />
                </View>
              </>
            )}
          </>
        )}

        {/* Priority (maintenance only) */}
        {taskType === 'maintenance' && (
          <>
            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.chipRow}>
              {([
                { key: 'high', label: 'Alta', color: '#fecaca' },
                { key: 'medium', label: 'Media', color: '#fef3c7' },
                { key: 'low', label: 'Baja', color: '#d1fae5' },
              ] as const).map(({ key, label, color }) => (
                <TouchableOpacity key={key} onPress={() => setPriority(key)} style={[styles.chip, priority === key && { backgroundColor: color }]}>
                  <Text style={[styles.chipText, priority === key && { color: '#111827', fontWeight: '600' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Assignees */}
        <Text style={styles.label}>Asignar a</Text>
        <View style={styles.chipRow}>
          {members.map((m) => (
            <TouchableOpacity key={m.user_id} onPress={() => toggleAssignee(m.user_id)} style={[styles.chip, selectedAssignees.includes(m.user_id) && styles.chipActive]}>
              <Text style={[styles.chipText, selectedAssignees.includes(m.user_id) && styles.chipTextActive]}>
                {selectedAssignees.includes(m.user_id) ? '✓ ' : ''}{m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Smart rotation (recurring + 2+ assignees) */}
        {selectedAssignees.length >= 2 && frequency !== 'once' && taskType === 'task' && (
          <View style={styles.rotationBox}>
            <Text style={styles.rotationTitle}>Rotación inteligente</Text>
            <View style={styles.chipRow}>
              {([
                { key: 'none', label: 'Sin rotación' },
                { key: 'fair', label: 'Equitativa' },
                { key: 'round_robin', label: 'Secuencial' },
              ] as const).map(({ key, label }) => (
                <TouchableOpacity key={key} onPress={() => setRotationStrategy(key)} style={[styles.chip, rotationStrategy === key && styles.chipActive]}>
                  <Text style={[styles.chipText, rotationStrategy === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {rotationStrategy !== 'none' && (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>Restricciones de días:</Text>
                {selectedAssignees.map((uid) => {
                  const member = members.find((m) => m.user_id === uid)
                  const excluded = excludedDays[uid] ?? []
                  return (
                    <View key={uid} style={styles.restrictionRow}>
                      <Text style={styles.restrictionName}>{member?.name?.split(' ')[0]}</Text>
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        {dayLabels.map((label, idx) => (
                          <TouchableOpacity key={idx} onPress={() => toggleExcludedDay(uid, idx)} style={[styles.restrictionDay, excluded.includes(idx) ? styles.restrictionDayOff : styles.restrictionDayOn]}>
                            <Text style={[styles.restrictionDayText, excluded.includes(idx) && { color: '#dc2626' }]}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )
                })}
                <Text style={styles.hint}>Rojo = no disponible</Text>
              </>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.formActions}>
          <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isLoading}>
            <Text style={styles.submitBtnText}>{isLoading ? 'Creando...' : taskType === 'maintenance' ? 'Registrar mantenimiento' : 'Crear tarea'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#2563eb' },
  chipOrange: { backgroundColor: '#ea580c' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#ffffff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  newBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  newBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cardOverdue: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#111827', flex: 1 },
  badge: { backgroundColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#9a3412' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#6b7280' },
  cardAssignee: { fontSize: 11, color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  completeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#34d399', alignItems: 'center', justifyContent: 'center' },
  completeBtnText: { fontSize: 16, color: '#059669', fontWeight: '700' },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  statusBtnBlue: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  statusBtnGreen: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  // Form styles
  formContainer: { flex: 1, backgroundColor: '#f9fafb' },
  formContent: { padding: 20, paddingBottom: 40 },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  hint: { fontSize: 11, color: '#d97706', marginBottom: 12, marginTop: -8 },
  dayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  dayBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  dayBtnTextActive: { color: '#ffffff' },
  rotationBox: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 16 },
  rotationTitle: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 10 },
  restrictionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  restrictionName: { fontSize: 12, fontWeight: '500', color: '#374151', width: 60 },
  restrictionDay: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  restrictionDayOn: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  restrictionDayOff: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  restrictionDayText: { fontSize: 9, fontWeight: '600', color: '#059669' },
  formActions: { gap: 12, marginTop: 8 },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontSize: 15 },
  addForm: {}, addInput: {}, addActions: {}, addBtn: {}, addBtnText: {}, cancelText: {},
})
