import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(search)"
        options={{
          title: 'Plan', tabBarLabel: 'Plan', headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'My Checklist', tabBarLabel: 'Checklist',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: 'My Vaccine Passport', tabBarLabel: 'Passport',
          tabBarIcon: ({ color, size }) => <Ionicons name="id-card-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile', tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
