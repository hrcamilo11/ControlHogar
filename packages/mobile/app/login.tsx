import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { supabase } from '../src/lib/supabase'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'

// Required for web browser to dismiss properly on Android
WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email y contraseña son requeridos')
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) Alert.alert('Error de inicio de sesión', error.message)
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: email.split('@')[0] } },
        })
        if (error) Alert.alert('Error de registro', error.message)
        else Alert.alert('Registro exitoso', 'Revisa tu email para verificar la cuenta')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Error inesperado')
    }

    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      const redirectUrl = Linking.createURL('auth/callback')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        Alert.alert('Error', error.message)
        return
      }

      if (!data?.url) {
        Alert.alert('Error', 'No se obtuvo URL de autenticación')
        return
      }

      // Open in-app auth browser (Chrome Custom Tab on Android)
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

      if (result.type === 'success' && result.url) {
        // Parse the URL to get tokens
        const url = new URL(result.url)
        // Tokens can be in hash fragment or query params
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const queryParams = new URLSearchParams(url.search)

        const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) Alert.alert('Error', sessionError.message)
        } else {
          Alert.alert('Error', 'No se recibieron las credenciales')
        }
      } else if (result.type === 'cancel') {
        // User cancelled, do nothing
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo iniciar con Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>ControlHogar</Text>
        <Text style={styles.subtitle}>Gestión del hogar colaborativa</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google OAuth */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#374151" />
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Abriendo...' : 'Continuar con Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#6b7280', marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { paddingHorizontal: 12, fontSize: 13, color: '#9ca3af' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
  },
  googleButtonText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  toggleText: { textAlign: 'center', color: '#2563eb', fontSize: 14, marginTop: 8 },
})
