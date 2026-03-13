import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { colors } from '../../theme/colors'

export default function AdminLayout() {
  const { isAdmin, isLoading } = useIsAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/home')
  }, [isAdmin, isLoading])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Panel' }} />
      <Stack.Screen name="proposal/[id]" options={{ title: 'Review Change' }} />
    </Stack>
  )
}
