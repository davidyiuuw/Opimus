import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

interface ShareVaccine {
  vaccine_id: number
  vaccine_name: string
}

interface ChecklistShare {
  id: string
  country_id: number
  country_name: string
  country_code: string
  entry_date: string | null
  vaccines: ShareVaccine[]
  created_at: string
}

const DUE_LEAD_DAYS = 28

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function dueDate(entryDate: string): string {
  const d = new Date(entryDate)
  d.setDate(d.getDate() - DUE_LEAD_DAYS)
  return formatDate(d.toISOString())
}

async function fetchShare(id: string): Promise<ChecklistShare> {
  const { data, error } = await supabase
    .from('checklist_shares')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as ChecklistShare
}

async function importToChecklist(share: ChecklistShare): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const rows = share.vaccines.map((v) => ({
    user_id: user.id,
    country_id: share.country_id,
    vaccine_id: v.vaccine_id,
    entry_date: share.entry_date ?? null,
  }))

  const { error } = await supabase
    .from('checklist_items')
    .upsert(rows, { onConflict: 'user_id,country_id,vaccine_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export default function SharedChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [imported, setImported] = useState(false)

  const { data: share, isLoading, error } = useQuery<ChecklistShare>({
    queryKey: ['share', id],
    queryFn: () => fetchShare(id),
    enabled: !!id,
  })

  const importMutation = useMutation({
    mutationFn: () => importToChecklist(share!),
    onSuccess: () => setImported(true),
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  async function handleAddToChecklist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/(auth)/sign-in')
      return
    }
    importMutation.mutate()
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error || !share) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load shared checklist.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.country}>{share.country_name}</Text>

        {share.entry_date && (
          <>
            <Text style={styles.meta}>Travel date: {formatDate(share.entry_date)}</Text>
            <Text style={styles.due}>Get vaccinated by {dueDate(share.entry_date)}</Text>
          </>
        )}

        <Text style={styles.sectionLabel}>Vaccines needed:</Text>
        {share.vaccines.map((v) => (
          <View key={v.vaccine_id} style={styles.vaccineRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.vaccineName}>{v.vaccine_name}</Text>
          </View>
        ))}
      </View>

      {imported ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Added to your checklist!</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/checklist')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Go to my checklist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleAddToChecklist}
          style={styles.primaryButton}
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Add to my checklist</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>Shared via Opimus · Travel Vaccination Planner</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { ...typography.body, color: colors.error },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  country: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  meta: { ...typography.body, color: colors.textSecondary },
  due: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  sectionLabel: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm, fontWeight: '600' },
  vaccineRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 2 },
  bullet: { ...typography.body, color: colors.textSecondary },
  vaccineName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  successBox: { gap: spacing.sm },
  successText: { ...typography.body, color: colors.success, textAlign: 'center', fontWeight: '600' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { ...typography.body, color: '#fff', fontWeight: '700' },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
})
