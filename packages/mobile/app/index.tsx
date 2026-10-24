import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../src/providers/AuthProvider'

export default function Index() {
  const { session, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (session) {
      router.replace('/(tabs)')
    } else {
      router.replace('/login')
    }
  }, [session, isLoading])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  )
}
