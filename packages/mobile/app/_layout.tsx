import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../src/providers/AuthProvider'
import { usePushNotifications } from '../src/lib/usePushNotifications'
import { AnimatedSplash } from '../src/components/AnimatedSplash'
import { supabase } from '../src/lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
    },
  },
})

function AuthGuard() {
  const { session, isLoading } = useAuth()
  const segments = useSegments()

  const { data: homes, isLoading: homesLoading } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('homes(id)').eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  useEffect(() => {
    if (isLoading) return
    if (session && homesLoading) return

    const inTabs = segments[0] === '(tabs)'
    const inCallback = segments[0] === 'auth'
    const inSetup = segments[0] === 'setup'
    const inLogin = segments[0] === 'login'

    if (inCallback) return

    if (!session && !inLogin) {
      router.replace('/login')
    } else if (session && homes && homes.length === 0 && !inSetup) {
      router.replace('/setup')
    } else if (session && homes && homes.length > 0 && !inTabs) {
      router.replace('/(tabs)')
    }
  }, [session, isLoading, homesLoading, homes, segments])

  return null
}

function PushNotificationRegistrar() {
  const { session } = useAuth()
  usePushNotifications(session?.user.id)
  return null
}

function AppContent() {
  const { isLoading } = useAuth()
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    if (!isLoading) setAppReady(true)
  }, [isLoading])

  return (
    <AnimatedSplash isReady={appReady}>
      <StatusBar style="dark" />
      <AuthGuard />
      <PushNotificationRegistrar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </AnimatedSplash>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  )
}
