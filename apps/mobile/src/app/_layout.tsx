import { useEffect } from 'react'
import { Stack, Redirect } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { colors } from '../theme/colors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function RootLayoutInner() {
  const { session, isLoading, setSession, setLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="results/[country]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="passport/upload" options={{ headerShown: true, title: 'Upload Proof' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  )
}
