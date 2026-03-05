import { Tabs } from 'expo-router'
import { colors } from '../../theme/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="(search)"
        options={{ title: 'Search', tabBarLabel: 'Search', headerShown: false }}
      />
      <Tabs.Screen
        name="checklist"
        options={{ title: 'My Checklist', tabBarLabel: 'Checklist' }}
      />
      <Tabs.Screen
        name="passport"
        options={{ title: 'My Vaccine Passport', tabBarLabel: 'Passport' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tabs>
  )
}
