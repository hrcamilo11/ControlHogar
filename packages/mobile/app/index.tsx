import { Redirect } from 'expo-router'
import { useAuth } from '../src/providers/AuthProvider'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/login" />
}
