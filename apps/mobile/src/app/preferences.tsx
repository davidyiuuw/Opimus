import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { spacing, borderRadius } from '../theme/spacing'

type DetailLevel = 'essential' | 'full'
type RiskTolerance = 'all' | 'required_only'

interface ToggleRowProps {
  label: string
  subLabel: string
  selected: boolean
  onPress: () => void
}

function ToggleRow({ label, subLabel, selected, onPress }: ToggleRowProps) {
  return (
    <TouchableOpacity
      style={[styles.toggleRow, selected && styles.toggleRowSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleRadio, selected && styles.toggleRadioSelected]}>
        {selected && <View style={styles.toggleRadioDot} />}
      </View>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, selected && styles.toggleLabelSelected]}>{label}</Text>
        <Text style={styles.toggleSub}>{subLabel}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function PreferencesScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [detailLevel, setDetailLevel] = useState<DetailLevel | null>(null)
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('users')
        .select('id, detail_level, risk_tolerance')
        .eq('id', session.user.id)
        .single()
      if (data) {
        setUserId(data.id)
        setDetailLevel(data.detail_level ?? null)
        setRiskTolerance(data.risk_tolerance ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save(field: 'detail_level' | 'risk_tolerance', value: string) {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', userId)
    setSaving(false)
    if (error) Alert.alert('Error', 'Could not save preference.')
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {saving && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.saving} />
      )}

      <Text style={styles.question}>How much detail would you like?</Text>
      <ToggleRow
        label="Essential only"
        subLabel="Vaccine name and level — no notes or sources"
        selected={detailLevel === 'essential'}
        onPress={() => { setDetailLevel('essential'); save('detail_level', 'essential') }}
      />
      <ToggleRow
        label="Full details"
        subLabel="All notes, sources, and booster intervals"
        selected={detailLevel === 'full'}
        onPress={() => { setDetailLevel('full'); save('detail_level', 'full') }}
      />

      <Text style={[styles.question, styles.questionSpaced]}>How cautious do you want to be?</Text>
      <ToggleRow
        label="Maximum protection"
        subLabel="Show Required, Recommended, and Routine vaccines"
        selected={riskTolerance === 'all'}
        onPress={() => { setRiskTolerance('all'); save('risk_tolerance', 'all') }}
      />
      <ToggleRow
        label="Entry & high-risk only"
        subLabel="Hide Routine vaccines — just the essentials for your trip"
        selected={riskTolerance === 'required_only'}
        onPress={() => { setRiskTolerance('required_only'); save('risk_tolerance', 'required_only') }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  saving: { alignSelf: 'flex-end', marginBottom: spacing.xs },
  question: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.xs },
  questionSpaced: { marginTop: spacing.lg },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  toggleRowSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF4FB',
  },
  toggleRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  toggleRadioSelected: { borderColor: colors.primary },
  toggleRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  toggleLabelSelected: { color: colors.primary },
  toggleSub: { ...typography.bodySmall, color: colors.textSecondary },
})
