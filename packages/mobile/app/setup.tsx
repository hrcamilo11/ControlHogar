import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/providers/AuthProvider'
import { Ionicons } from '@expo/vector-icons'

type Mode = 'choose' | 'create' | 'join'

export default function SetupScreen() {
  const [mode, setMode] = useState<Mode>('choose')

  if (mode === 'create') return <CreateHome onBack={() => setMode('choose')} />
  if (mode === 'join') return <JoinHome onBack={() => setMode('choose')} />

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="home" size={48} color="#2563eb" style={{ alignSelf: 'center' }} />
        <Text style={styles.title}>Bienvenido a ControlHogar</Text>
        <Text style={styles.subtitle}>¿Qué quieres hacer?</Text>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')}>
          <View style={[styles.optionIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="add-circle-outline" size={28} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Crear un hogar nuevo</Text>
            <Text style={styles.optionDesc}>Empieza de cero y luego invita a tu grupo</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')}>
          <View style={[styles.optionIcon, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="people-outline" size={28} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Tengo un código</Text>
            <Text style={styles.optionDesc}>Alguien me compartió un código de 6 caracteres</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function CreateHome({ onBack }: { onBack: () => void }) {
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Nombre es obligatorio'); return }
    setIsLoading(true)

    const { error } = await supabase.from('homes').insert({
      name: name.trim(),
      created_by: session!.user.id,
    })

    if (error) Alert.alert('Error', error.message)
    else {
      Alert.alert('Listo', '¡Hogar creado!', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }])
    }
    setIsLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>Crear hogar</Text>

        <Text style={styles.label}>Nombre del hogar</Text>
        <TextInput style={styles.input} placeholder="Ej: Apartamento Centro" value={name} onChangeText={setName} maxLength={100} autoFocus />

        <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.6 }]} onPress={handleCreate} disabled={isLoading}>
          <Text style={styles.submitBtnText}>{isLoading ? 'Creando...' : 'Crear Hogar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function JoinHome({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleJoin = async () => {
    if (code.length < 6) { Alert.alert('Error', 'El código debe tener 6 caracteres'); return }
    setIsLoading(true)

    const { data, error } = await supabase.rpc('join_home_by_code', { p_code: code.toUpperCase() })

    if (error) {
      Alert.alert('Error', error.message)
    } else if (data && typeof data === 'object') {
      const result = data as { success: boolean; error?: string; home_name?: string; already_member?: boolean }
      if (result.success) {
        const msg = result.already_member
          ? `Ya eres miembro de "${result.home_name}"`
          : `¡Te uniste a "${result.home_name}"!`
        Alert.alert('Listo', msg, [{ text: 'OK', onPress: () => router.replace('/(tabs)') }])
      } else {
        Alert.alert('Error', result.error ?? 'Código inválido o expirado')
      }
    }

    setIsLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>Unirse a un hogar</Text>
        <Text style={styles.subtitle}>Ingresa el código que te compartieron</Text>

        <TextInput
          style={styles.codeInput}
          placeholder="ABC123"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-F0-9]/g, ''))}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
        />

        <TouchableOpacity style={[styles.joinBtn, (isLoading || code.length < 6) && { opacity: 0.6 }]} onPress={handleJoin} disabled={isLoading || code.length < 6}>
          <Text style={styles.joinBtnText}>{isLoading ? 'Verificando...' : 'Unirme al hogar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#111827', marginTop: 16 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#6b7280', marginTop: 8, marginBottom: 32 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 18, marginBottom: 12 },
  optionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  optionDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  // Form
  formContent: { padding: 24, paddingTop: 60 },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  codeInput: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#d1d5db', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 18, fontSize: 28, fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', letterSpacing: 8, marginTop: 24 },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  joinBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  joinBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { fontSize: 14, color: '#374151' },
})
