import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { OpimusMenu } from '../../components/OpimusMenu'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

async function fetchDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', userId)
    .single()
  return data?.display_name ?? null
}

export default function HomeScreen() {
  const { session } = useAuthStore()
  const userId = session?.user?.id

  const { data: displayName } = useQuery({
    queryKey: ['displayName', userId],
    queryFn: () => fetchDisplayName(userId!),
    enabled: !!userId,
  })

  const resolvedName =
    displayName ??
    session?.user?.user_metadata?.full_name ??
    session?.user?.email?.split('@')[0] ??
    'there'
  const firstName = resolvedName.split(' ')[0]

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Blue header ── */}
        <View style={styles.header}>

          {/* Top row: Opimus button top-right */}
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.opimusBlock}>
              <OpimusMenu tint="light" />
              <Text style={styles.tagline}>Your health travels with you.</Text>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>
            {getGreeting()},{'\n'}{firstName}.
          </Text>
        </View>

        {/* ── White content panel ── */}
        <View style={styles.body}>

          {/* ── Plan card ── */}
          <TouchableOpacity
            style={styles.planCard}
            onPress={() => router.navigate('/(tabs)/(search)')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardIcon}>🌍</Text>
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={[styles.badgeText, styles.badgeTextGreen]}>Available</Text>
              </View>
            </View>
            <Text style={styles.planCardTitle}>Plan for Vaccinations</Text>
            <Text style={styles.cardBody}>
              Find out which vaccines you need for your next destination and build your health plan before you go.
            </Text>
            <Text style={styles.planCardCta}>Get started →</Text>
          </TouchableOpacity>

          {/* ── Coming soon card ── */}
          <View style={styles.comingCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardIcon}>💊</Text>
              <View style={[styles.badge, styles.badgeAmber]}>
                <Text style={[styles.badgeText, styles.badgeTextAmber]}>Coming soon</Text>
              </View>
            </View>
            <Text style={styles.comingCardTitle}>Reimagining health with digitization</Text>
            <Text style={[styles.cardBody, styles.cardBodyMuted]}>
              A smarter way to manage your health records, track immunizations, and stay ahead of what your body needs.
            </Text>
          </View>

          {/* ── Footer note ── */}
          <Text style={styles.footerNote}>
            Always consult a travel health professional for personalized advice.
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scrollContent: { flexGrow: 1 },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  opimusBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  tagline: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 44,
    marginTop: spacing.sm,
  },

  // ── White body ──
  body: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -spacing.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },

  // ── Shared card pieces ──
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardIcon: { fontSize: 36 },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { ...typography.caption, fontWeight: '700' },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeTextGreen: { color: '#2E7D32' },
  badgeAmber: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFCC80' },
  badgeTextAmber: { color: '#E65100' },
  cardBody: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
  cardBodyMuted: { color: colors.textMuted },

  // ── Plan card ──
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  planCardTitle: { ...typography.h2, color: colors.textPrimary },
  planCardCta: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  // ── Coming soon card ──
  comingCard: {
    backgroundColor: '#FFF9F4',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#FDDCBA',
  },
  comingCardTitle: { ...typography.h2, color: colors.textSecondary },

  // ── Footer note ──
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    lineHeight: 18,
  },
})
