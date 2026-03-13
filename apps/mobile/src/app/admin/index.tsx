import React from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

interface Proposal {
  id: string
  source: string
  is_new_entry: boolean
  current_level: string | null
  proposed_level: string
  current_notes: string | null
  proposed_notes: string | null
  current_source_url: string | null
  proposed_source_url: string | null
  created_at: string
  countries: { name: string; code: string }
  vaccines: { name: string }
}

async function fetchPendingProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('scraper_proposals')
    .select('*, countries(name, code), vaccines(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Proposal[]
}

function changedFields(p: Proposal): string {
  const fields = [
    p.current_level !== p.proposed_level && 'level',
    p.current_notes !== p.proposed_notes && 'notes',
    p.current_source_url !== p.proposed_source_url && 'source URL',
  ].filter(Boolean)
  return fields.join(', ')
}

export default function AdminIndexScreen() {
  const router = useRouter()
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['adminProposals'],
    queryFn: fetchPendingProposals,
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {proposals.length} pending {proposals.length === 1 ? 'change' : 'changes'}
        </Text>
        <Text style={styles.headerSub}>Scraped from CDC — review before going live</Text>
      </View>

      {proposals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>All up to date</Text>
          <Text style={styles.emptyBody}>No pending changes from the last scrape.</Text>
        </View>
      ) : (
        <FlatList
          data={proposals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/admin/proposal/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.badge, item.is_new_entry ? styles.badgeNew : styles.badgeUpdated]}>
                  <Text style={[styles.badgeText, item.is_new_entry ? styles.badgeTextNew : styles.badgeTextUpdated]}>
                    {item.is_new_entry ? 'New' : 'Updated'}
                  </Text>
                </View>
                <Text style={styles.source}>{item.source.toUpperCase()}</Text>
              </View>

              <Text style={styles.vaccineName}>{(item.vaccines as any)?.name ?? 'Unknown vaccine'}</Text>
              <Text style={styles.countryName}>{(item.countries as any)?.name ?? 'Unknown country'}</Text>

              {!item.is_new_entry && (
                <Text style={styles.changedFields}>Changed: {changedFields(item)}</Text>
              )}

              <Text style={styles.reviewText}>Tap to review →</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeNew: { backgroundColor: '#E8F5E9' },
  badgeUpdated: { backgroundColor: '#FFF3E0' },
  badgeText: { ...typography.caption, fontWeight: '700' },
  badgeTextNew: { color: '#2E7D32' },
  badgeTextUpdated: { color: '#E65100' },
  source: { ...typography.caption, color: colors.textMuted },
  vaccineName: { ...typography.h3, color: colors.textPrimary },
  countryName: { ...typography.bodySmall, color: colors.textSecondary },
  changedFields: { ...typography.caption, color: colors.warning, marginTop: 2 },
  reviewText: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.h2, color: colors.textPrimary },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
})
