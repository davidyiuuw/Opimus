import { Tabs } from 'expo-router'
import { colors } from '../../theme/colors'
import { OpimusMenu } from '../../components/OpimusMenu'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // Hide the tab bar entirely when on the home screen
        tabBarStyle: route.name === 'home'
          ? { display: 'none' }
          : { borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <OpimusMenu />,
      })}
    >
      {/* Home — hidden from tab bar, tab bar itself hidden when active */}
      <Tabs.Screen
        name="home"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{ title: 'Plan', tabBarLabel: 'Plan', headerShown: false }}
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
