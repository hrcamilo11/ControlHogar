import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, ScrollView } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../src/providers/AuthProvider'
import { supabase } from '../../src/lib/supabase'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type Section = 'menu' | 'notifications' | 'calendar' | 'members'

export default function MoreTab() {
  const { session, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('menu')

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
        await signOut()
        router.replace('/login')
      }},
    ])
  }

  if (activeSection === 'notifications') return <NotificationsScreen onBack={() => setActiveSection('menu')} />
  if (activeSection === 'calendar') return <CalendarScreen onBack={() => setActiveSection('menu')} />
  if (activeSection === 'members') return <MembersScreen onBack={() => setActiveSection('menu')} />

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        <TouchableOpacity style={styles.row} onPress={() => setActiveSection('notifications')}>
          <Ionicons name="notifications-outline" size={22} color="#6b7280" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Notificaciones</Text>
            <Text style={styles.rowSubtitle}>Alertas y recordatorios</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setActiveSection('calendar')}>
          <Ionicons name="calendar-outline" size={22} color="#6b7280" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Calendario</Text>
            <Text style={styles.rowSubtitle}>Tareas y pagos del mes</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setActiveSection('members')}>
          <Ionicons name="people-outline" size={22} color="#6b7280" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Miembros</Text>
            <Text style={styles.rowSubtitle}>Gestionar miembros del hogar</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </TouchableOpacity>

        <View style={styles.row}>
          <Ionicons name="person-outline" size={22} color="#6b7280" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Mi cuenta</Text>
            <Text style={styles.rowSubtitle}>{session?.user.email}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ControlHogar v1.0.0</Text>
    </View>
  )
}

// ─── Notifications ───
function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: homes } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('homes(id)').eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  const homeId = homes?.[0]?.id

  const { data: notifications } = useQuery({
    queryKey: ['notifications', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      return data ?? []
    },
  })

  const handleMarkRead = async (id: string) => {
    await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['notifications', homeId] })
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notificaciones" onBack={onBack} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.read_at && styles.notifUnread]}
            onPress={() => handleMarkRead(item.id)}
          >
            <View style={[styles.notifDot, { backgroundColor: item.type?.includes('overdue') ? '#ef4444' : '#3b82f6' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifBody}>{item.body}</Text>
              <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>Sin notificaciones</Text>}
      />
    </View>
  )
}

// ─── Calendar ───
function CalendarScreen({ onBack }: { onBack: () => void }) {
  const { session } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data: homes } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('homes(id)').eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  const homeId = homes?.[0]?.id

  const { data: tasks } = useQuery({
    queryKey: ['calendar-tasks', homeId, currentMonth.getMonth()],
    enabled: !!homeId,
    queryFn: async () => {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const { data } = await supabase
        .from('tasks')
        .select('id, title, next_due_date, task_type')
        .eq('home_id', homeId!)
        .eq('is_active', true)
        .gte('next_due_date', start.toISOString())
        .lte('next_due_date', end.toISOString())
      return data ?? []
    },
  })

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const today = new Date()

  const dayNames = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S']
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const tasksPerDay: Record<number, typeof tasks> = {}
  for (const task of tasks ?? []) {
    if (task.next_due_date) {
      const day = new Date(task.next_due_date).getDate()
      if (!tasksPerDay[day]) tasksPerDay[day] = []
      tasksPerDay[day]!.push(task)
    }
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  return (
    <View style={styles.container}>
      <ScreenHeader title="Calendario" onBack={onBack} />

      {/* Month navigation */}
      <View style={styles.calNav}>
        <TouchableOpacity onPress={prevMonth}><Ionicons name="chevron-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={styles.calMonth}>{monthNames[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth}><Ionicons name="chevron-forward" size={24} color="#374151" /></TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.calRow}>
        {dayNames.map((d) => <Text key={d} style={styles.calDayHeader}>{d}</Text>)}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {Array.from({ length: firstDayOfWeek }, (_, i) => <View key={`e-${i}`} style={styles.calCell} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const hasTasks = !!tasksPerDay[day]?.length
          return (
            <View key={day} style={[styles.calCell, isToday && styles.calCellToday]}>
              <Text style={[styles.calDayText, isToday && styles.calDayTextToday]}>{day}</Text>
              {hasTasks && <View style={styles.calDot} />}
            </View>
          )
        })}
      </View>

      {/* Tasks this month */}
      <ScrollView style={{ flex: 1, marginTop: 16 }}>
        {(tasks ?? []).sort((a, b) => new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime()).map((task) => (
          <View key={task.id} style={styles.calTask}>
            <View style={[styles.calTaskDot, { backgroundColor: task.task_type === 'maintenance' ? '#f97316' : '#3b82f6' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.calTaskTitle}>{task.title}</Text>
              <Text style={styles.calTaskDate}>{new Date(task.next_due_date!).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            </View>
          </View>
        ))}
        {!tasks?.length && <Text style={styles.empty}>Sin actividades este mes</Text>}
      </ScrollView>
    </View>
  )
}

// ─── Members ───
function MembersScreen({ onBack }: { onBack: () => void }) {
  const { session } = useAuth()

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
    queryKey: ['home-members-full', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('user_id, role, profiles(display_name, email)').eq('home_id', homeId!)
      return (data ?? []).map((m: any) => ({ ...m, profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles }))
    },
  })

  const roleColors: Record<string, string> = { owner: '#fbbf24', admin: '#3b82f6', member: '#10b981', guest: '#9ca3af' }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Miembros" onBack={onBack} />
      <View style={styles.membersList}>
        {members?.map((m: any) => (
          <View key={m.user_id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{m.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {m.profiles?.display_name}
                {m.user_id === session?.user.id && ' (tú)'}
              </Text>
              <Text style={styles.memberEmail}>{m.profiles?.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: roleColors[m.role] + '22', borderColor: roleColors[m.role] }]}>
              <Text style={[styles.roleBadgeText, { color: roleColors[m.role] }]}>{m.role}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Shared Header ───
function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#374151" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  list: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  rowSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, paddingHorizontal: 16 },
  signOutText: { fontSize: 15, fontWeight: '500', color: '#dc2626' },
  version: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 32 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  // Notifications
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  notifUnread: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notifBody: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  notifTime: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  // Calendar
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calMonth: { fontSize: 16, fontWeight: '600', color: '#111827' },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 8 },
  calCellToday: { backgroundColor: '#eff6ff', borderRadius: 8 },
  calDayText: { fontSize: 14, color: '#374151' },
  calDayTextToday: { fontWeight: '700', color: '#2563eb' },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3b82f6', marginTop: 2 },
  calTask: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  calTaskDot: { width: 8, height: 8, borderRadius: 4 },
  calTaskTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  calTaskDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  // Members
  membersList: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
  memberName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 },
})
