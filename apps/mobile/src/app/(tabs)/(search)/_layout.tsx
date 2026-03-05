import { Stack } from 'expo-router'
import { colors } from '../../../theme/colors'

export default function SearchStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="results/[country]"
        options={{ headerShown: true, title: '', headerBackTitle: 'Search' }}
      />
    </Stack>
  )
}
