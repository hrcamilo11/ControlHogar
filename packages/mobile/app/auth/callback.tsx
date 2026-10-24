import { useEffect } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../../src/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      // Get the full URL that opened this screen
      const url = await Linking.getInitialURL()

      if (url) {
        // Parse tokens from the URL hash fragment
        const hashIndex = url.indexOf('#')
        if (hashIndex !== -1) {
          const params = new URLSearchParams(url.substring(hashIndex + 1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            // Session set — AuthProvider will detect the change and index.tsx will redirect
            router.replace('/(tabs)')
            return
          }
        }

        // Try query params as fallback
        const queryIndex = url.indexOf('?')
        if (queryIndex !== -1) {
          const params = new URLSearchParams(url.substring(queryIndex + 1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            router.replace('/(tabs)')
            return
          }
        }
      }

      // If we get here without tokens, just go to home (session might already be set)
      router.replace('/')
    } catch (err) {
      console.error('Auth callback error:', err)
      router.replace('/')
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Iniciando sesión...</Text>
    </View>
  )
}
