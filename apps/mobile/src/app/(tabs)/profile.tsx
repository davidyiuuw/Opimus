import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet,  Alert, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { UserProfile } from '@opimus/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setProfile(data)
        setDisplayName(data.display_name ?? '')
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    setSaving(false)
    if (error) Alert.alert('Error', 'Could not save changes.')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    // onAuthStateChange in _layout.tsx handles redirect to (auth)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.email}>{supabase.auth['_session']?.user?.email ?? ''}</Text>
        </View>

        <Input
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
        />

        <Button label="Save Changes" onPress={handleSave} loading={saving} />

        <View style={styles.spacer} />

        <Button label="Sign Out" onPress={handleSignOut} variant="outline" />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.h1, color: '#fff' },
  email: { ...typography.body, color: colors.textSecondary },
  spacer: { flex: 1 },
})
