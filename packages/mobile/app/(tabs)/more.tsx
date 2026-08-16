import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../src/providers/AuthProvider'
import { Ionicons } from '@expo/vector-icons'

export default function MoreTab() {
  const { session, signOut } = useAuth()

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ])
  }

  const sections = [
    { icon: 'person-outline' as const, title: 'Mi cuenta', subtitle: session?.user.email },
    { icon: 'notifications-outline' as const, title: 'Notificaciones', subtitle: 'Alertas y recordatorios' },
    { icon: 'people-outline' as const, title: 'Miembros', subtitle: 'Gestionar miembros del hogar' },
    { icon: 'color-palette-outline' as const, title: 'Apariencia', subtitle: 'Tema y colores' },
    { icon: 'download-outline' as const, title: 'Exportar datos', subtitle: 'CSV de tareas y gastos' },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {sections.map((item, i) => (
          <TouchableOpacity key={i} style={styles.row}>
            <Ionicons name={item.icon} size={22} color="#6b7280" style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.subtitle && <Text style={styles.rowSubtitle}>{item.subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ControlHogar v1.0.0</Text>
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
})
