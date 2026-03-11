import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Dimensions, InteractionManager } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { UserProfile } from '@opimus/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { OpimusMenu } from '../../components/OpimusMenu'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'

const NAV_BAR_HEIGHT = 56
const INITIAL_SCROLL = { x: 0, y: NAV_BAR_HEIGHT }
const WINDOW_HEIGHT = Dimensions.get('window').height

export default function ProfileScreen() {
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
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

  const [scrollReady, setScrollReady] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setScrollReady(false)
      const task = InteractionManager.runAfterInteractions(() => {
        scrollRef.current?.scrollTo({ y: NAV_BAR_HEIGHT, animated: false })
        setScrollReady(true)
      })
      return () => { task.cancel(); setScrollReady(false) }
    }, []),
  )

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
    await AsyncStorage.removeItem('idk_popup_count')
    await supabase.auth.signOut()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentOffset={INITIAL_SCROLL} alwaysBounceVertical contentContainerStyle={styles.scroll} style={{ opacity: scrollReady ? 1 : 0 }}>

        {/* ── Opimus nav bar — hidden above fold, revealed on pull-down ── */}
        <View style={styles.navBar}>
          <View style={{ flex: 1 }} />
          <OpimusMenu />
        </View>

        <Text style={styles.pageTitle}>Profile</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
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

            <TouchableOpacity style={styles.navRow} onPress={() => router.push('/preferences')} activeOpacity={0.7}>
              <Text style={styles.navRowLabel}>Preferences</Text>
              <Text style={styles.navRowChevron}>›</Text>
            </TouchableOpacity>

            <Button label="Sign Out" onPress={handleSignOut} variant="outline" style={styles.signOut} />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingTop: 0, minHeight: WINDOW_HEIGHT + NAV_BAR_HEIGHT },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: NAV_BAR_HEIGHT,
    paddingHorizontal: spacing.sm,
  },
  pageTitle: { ...typography.h1, fontSize: 30, lineHeight: 38, color: colors.textPrimary, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, marginTop: spacing.lg },
  loader: { marginTop: spacing.xl },
  content: { padding: spacing.sm, gap: spacing.md },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.h1, color: '#fff' },
  email: { ...typography.body, color: colors.textSecondary },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  navRowLabel: { ...typography.body, color: colors.textPrimary },
  navRowChevron: { fontSize: 22, color: colors.textMuted, lineHeight: 26 },
  signOut: { marginTop: spacing.sm },
})
