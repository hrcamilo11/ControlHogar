import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/AuthProvider'

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    supabase
      .from('invitations')
      .select('*, homes(name)')
      .eq('token', token)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setError('Invitación no válida o expirada')
        else if (new Date(data.expires_at) < new Date()) setError('Invitación expirada')
        else setInvitation(data)
      })
  }, [token])

  const handleAccept = async () => {
    if (!session || !invitation) return
    setIsLoading(true)

    const { error: memberError } = await supabase.from('home_members').insert({
      home_id: invitation.home_id,
      user_id: session.user.id,
      role: invitation.role,
    })

    if (memberError) {
      Alert.alert('Error', memberError.message)
    } else {
      await supabase.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id)
      Alert.alert('Listo', `Te uniste a ${invitation.homes?.name}`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ])
    }
    setIsLoading(false)
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invitación</Text>
        <Text style={styles.message}>Inicia sesión para aceptar esta invitación.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')}>
          <Text style={styles.btnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invitación</Text>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnSecondaryText}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!invitation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invitación</Text>
      <Text style={styles.message}>Has sido invitado a unirte a:</Text>
      <Text style={styles.homeName}>{invitation.homes?.name}</Text>
      <Text style={styles.role}>Rol: {invitation.role}</Text>

      <TouchableOpacity style={[styles.btn, isLoading && { opacity: 0.6 }]} onPress={handleAccept} disabled={isLoading}>
        <Text style={styles.btnText}>{isLoading ? 'Aceptando...' : 'Aceptar invitación'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#111827', marginBottom: 16 },
  message: { fontSize: 15, textAlign: 'center', color: '#6b7280', marginBottom: 8 },
  homeName: { fontSize: 20, fontWeight: '600', textAlign: 'center', color: '#2563eb', marginBottom: 8 },
  role: { fontSize: 14, textAlign: 'center', color: '#6b7280', marginBottom: 32 },
  error: { fontSize: 15, textAlign: 'center', color: '#dc2626', marginBottom: 24 },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { color: '#374151', fontSize: 15, fontWeight: '500' },
})
