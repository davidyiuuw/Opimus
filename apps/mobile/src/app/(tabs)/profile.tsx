import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Dimensions, InteractionManager, Platform } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
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

function formatDob(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ProfileScreen() {
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null)
  const [showDobPicker, setShowDobPicker] = useState(false)
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
        setDateOfBirth(data.date_of_birth ? new Date(data.date_of_birth) : null)
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

  function handleDobChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDobPicker(false)
    if (date) setDateOfBirth(date)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString(),
      })
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

            {/* Date of birth */}
            <View style={styles.dobSection}>
              <Text style={styles.dobLabel}>
                Date of Birth <Text style={styles.dobOptional}>(optional)</Text>
              </Text>
              <Text style={styles.dobHint}>
                Helps us flag age-specific vaccine eligibility and identify higher-risk profiles.
              </Text>
              <TouchableOpacity
                style={[styles.dobButton, dateOfBirth && styles.dobButtonFilled]}
                onPress={() => setShowDobPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dobButtonText, dateOfBirth && styles.dobButtonTextFilled]}>
                  {dateOfBirth ? formatDob(dateOfBirth) : 'Tap to set date of birth'}
                </Text>
                {dateOfBirth && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setDateOfBirth(null); setShowDobPicker(false) }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.dobClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showDobPicker && (
                <>
                  <DateTimePicker
                    value={dateOfBirth ?? new Date(1990, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDobChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    themeVariant="light"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity style={styles.dobDoneBtn} onPress={() => setShowDobPicker(false)}>
                      <Text style={styles.dobDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

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
  dobSection: { gap: spacing.xs },
  dobLabel: { ...typography.label, color: colors.textPrimary },
  dobOptional: { ...typography.label, color: colors.textMuted, fontWeight: '400' },
  dobHint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginBottom: 2 },
  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dobButtonFilled: {
    borderColor: colors.primary,
    backgroundColor: '#EEF4FB',
  },
  dobButtonText: { ...typography.body, color: colors.textMuted },
  dobButtonTextFilled: { color: colors.textPrimary },
  dobClear: { ...typography.body, color: colors.textMuted, paddingLeft: spacing.sm },
  dobDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dobDoneText: { ...typography.body, color: colors.primary, fontWeight: '600' },
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
