import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { spacing, borderRadius } from '../theme/spacing'
import { Button } from '../components/ui/Button'

type DetailLevel = 'essential' | 'full'
type RiskTolerance = 'all' | 'required_only'

interface OptionCardProps {
  label: string
  description: string
  selected: boolean
  onPress: () => void
}

function OptionCard({ label, description, selected, onPress }: OptionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.optionCardInner}>
        <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
          {selected && <View style={styles.optionRadioDot} />}
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function formatDob(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function OnboardingScreen() {
  const router = useRouter()
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding)
  const [detailLevel, setDetailLevel] = useState<DetailLevel | null>(null)
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null)
  const [showDobPicker, setShowDobPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const canSubmit = detailLevel !== null && riskTolerance !== null

  function handleDobChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDobPicker(false)
    if (date) setDateOfBirth(date)
  }

  async function handleGetStarted() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('users')
        .update({
          detail_level: detailLevel,
          risk_tolerance: riskTolerance,
          date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw new Error(error.message)
      setNeedsOnboarding(false)
      router.replace('/home')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Personalise your experience</Text>
        <Text style={styles.subtitle}>
          Answer a few quick questions so we can tailor your vaccine recommendations.
        </Text>
      </View>

      {/* Question 1 */}
      <View style={styles.section}>
        <Text style={styles.question}>How much detail would you like me to cover?</Text>
        <OptionCard
          label="Tell me what I need, skip the details"
          description="Just the vaccine name and whether it's required — clean and simple."
          selected={detailLevel === 'essential'}
          onPress={() => setDetailLevel('essential')}
        />
        <OptionCard
          label="I want to read all the details"
          description="Show full notes, sources, and booster intervals for every vaccine."
          selected={detailLevel === 'full'}
          onPress={() => setDetailLevel('full')}
        />
      </View>

      {/* Question 2 */}
      <View style={styles.section}>
        <Text style={styles.question}>How cautious do you want to be?</Text>
        <OptionCard
          label="I want to be as protected as possible"
          description="Show all vaccines — required, recommended, and routine."
          selected={riskTolerance === 'all'}
          onPress={() => setRiskTolerance('all')}
        />
        <OptionCard
          label="I only want vaccines required for entry or high-risk diseases"
          description="Hide routine vaccines — just the essentials for your trip."
          selected={riskTolerance === 'required_only'}
          onPress={() => setRiskTolerance('required_only')}
        />
      </View>

      {/* Date of birth (optional) */}
      <View style={styles.section}>
        <Text style={styles.question}>Date of birth <Text style={styles.optional}>(optional)</Text></Text>
        <Text style={styles.dobHint}>
          Helps us flag age-specific vaccine eligibility and identify if you or a family member may be at higher risk for certain diseases.
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

      <Button
        label={saving ? 'Saving…' : 'Get started'}
        onPress={handleGetStarted}
        loading={saving}
        style={[styles.cta, !canSubmit && styles.ctaDisabled]}
      />
      {!canSubmit && (
        <Text style={styles.hint}>Answer the first two questions to continue.</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingVertical: spacing.xl, gap: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  question: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  optional: { ...typography.h3, color: colors.textMuted, fontWeight: '400' },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF4FB',
  },
  optionCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  optionRadioSelected: {
    borderColor: colors.primary,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  optionLabelSelected: { color: colors.primary },
  optionDescription: { ...typography.bodySmall, color: colors.textSecondary },
  dobHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
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
  dobDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dobDoneText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  cta: { marginTop: spacing.sm },
  ctaDisabled: { opacity: 0.4 },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
})
