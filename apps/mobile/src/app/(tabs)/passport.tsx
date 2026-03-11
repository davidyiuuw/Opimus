import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useRef, useCallback, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, InteractionManager,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserVaccine } from '@opimus/types'
import { supabase } from '../../lib/supabase'
import { OpimusMenu } from '../../components/OpimusMenu'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

const NAV_BAR_HEIGHT = 56
const INITIAL_SCROLL = { x: 0, y: NAV_BAR_HEIGHT }
const WINDOW_HEIGHT = Dimensions.get('window').height

async function fetchPassport(): Promise<UserVaccine[]> {
  const { data, error } = await supabase
    .from('user_vaccines')
    .select(`
      id, vaccine_id, administered_at, notes, created_at,
      vaccines ( id, name, manufacturer, doses, notes,
        diseases ( id, slug, name )
      ),
      vaccine_documents ( id, doc_type, file_url, file_name, uploaded_at )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((entry: any) => ({
    ...entry,
    vaccine: entry.vaccines
      ? { ...entry.vaccines, disease: entry.vaccines.diseases ?? undefined }
      : undefined,
    documents: entry.vaccine_documents ?? [],
  }))
}

async function removeVaccine(id: number): Promise<void> {
  const { error } = await supabase
    .from('user_vaccines')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export default function PassportScreen() {
  const queryClient = useQueryClient()
  const scrollRef = useRef<ScrollView>(null)
  const [scrollReady, setScrollReady] = useState(false)

  const { data: entries = [], isLoading } = useQuery<UserVaccine[]>({
    queryKey: ['passport'],
    queryFn: fetchPassport,
  })

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

  const removeMutation = useMutation({
    mutationFn: removeVaccine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passport'] })
      queryClient.invalidateQueries({ queryKey: ['passportIds'] })
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentOffset={INITIAL_SCROLL} alwaysBounceVertical contentContainerStyle={styles.list} style={{ opacity: scrollReady ? 1 : 0 }}>

        {/* ── Opimus nav bar — hidden above fold, revealed on pull-down ── */}
        <View style={styles.navBar}>
          <View style={{ flex: 1 }} />
          <OpimusMenu />
        </View>

        <Text style={styles.pageTitle}>My Vaccine Passport</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💉</Text>
            <Text style={styles.emptyTitle}>No vaccines logged yet</Text>
            <Text style={styles.emptyBody}>
              Search for a destination to see what vaccines are needed, then tap
              "I have this vaccine" to add them here.
            </Text>
          </View>
        ) : (
          entries.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.vaccineName}>{item.vaccine?.name ?? 'Vaccine'}</Text>
                  {item.vaccine?.disease && (
                    <Text style={styles.diseaseName}>{item.vaccine.disease.name}</Text>
                  )}
                </View>
                <View style={styles.coveredBadge}>
                  <Text style={styles.coveredText}>✓ Have it</Text>
                </View>
              </View>

              {item.administered_at && (
                <Text style={styles.date}>
                  Received: {new Date(item.administered_at).toLocaleDateString()}
                </Text>
              )}

              <View style={styles.docRow}>
                {item.documents && item.documents.length > 0 ? (
                  <Text style={styles.docAttached}>
                    📄 {item.documents.length} document(s) uploaded
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => router.push(`/passport/upload?vaccineId=${item.id}`)}
                  >
                    <Text style={styles.uploadLink}>Upload proof →</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => removeMutation.mutate(item.id)}>
                  <Text style={styles.remove}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm, minHeight: WINDOW_HEIGHT + NAV_BAR_HEIGHT },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: NAV_BAR_HEIGHT,
    paddingHorizontal: spacing.sm,
  },
  pageTitle: { ...typography.h1, fontSize: 30, lineHeight: 38, color: colors.textPrimary, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs, marginTop: spacing.md },
  loader: { marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1 },
  vaccineName: { ...typography.h3, color: colors.textPrimary },
  diseaseName: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  coveredBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  coveredText: { ...typography.bodySmall, color: '#2E7D32', fontWeight: '700' },
  date: { ...typography.bodySmall, color: colors.textSecondary },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docAttached: { ...typography.bodySmall, color: colors.success },
  uploadLink: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  remove: { fontSize: 18 },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})
