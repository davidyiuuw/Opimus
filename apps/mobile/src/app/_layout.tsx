import { useEffect, useRef } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
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
  const { session, isLoading, setSession, setLoading, needsOnboarding, setNeedsOnboarding } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  // Prevents redirect-to-home looping after the user navigates away from home
  const hasRedirectedToHome = useRef(false)

  // Subscribe to Supabase auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  // Fetch onboarding status after session is known
  useEffect(() => {
    if (isLoading) return
    if (!session) {
      setNeedsOnboarding(null)
      return
    }

    supabase
      .from('users')
      .select('detail_level')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setNeedsOnboarding(data?.detail_level == null)
      })
  }, [session, isLoading])

  // Redirect based on auth + onboarding state
  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'
    const inHome = segments[0] === 'home'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
      return
    }

    if (session) {
      // Still checking onboarding status
      if (needsOnboarding === null) return

      if (needsOnboarding && !inOnboarding) {
        router.replace('/onboarding')
        return
      }

      if (!needsOnboarding) {
        if (inAuthGroup || inOnboarding) {
          // Coming from sign-in or onboarding — reset flag so home shows fresh
          hasRedirectedToHome.current = false
        }
        if (!inHome && !hasRedirectedToHome.current) {
          hasRedirectedToHome.current = true
          router.replace('/home')
        }
      }
    }
  }, [session, isLoading, needsOnboarding, segments, router])

  if (isLoading || (session && needsOnboarding === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="home" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="preferences" options={{ headerShown: true, title: 'Preferences' }} />
      <Stack.Screen name="passport/upload" options={{ headerShown: true, title: 'Upload Proof' }} />
      <Stack.Screen name="share/[id]" options={{ headerShown: true, title: 'Shared Checklist' }} />
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
