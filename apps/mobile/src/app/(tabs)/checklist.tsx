import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Dimensions, InteractionManager, Share,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { OpimusMenu } from '../../components/OpimusMenu'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

interface ChecklistVaccine {
  id: number
  vaccine_id: number
  vaccine_name: string
  created_at: string
}

interface ChecklistTrip {
  country_id: number
  country_code: string
  country_name: string
  entry_date: string | null   // ISO date string YYYY-MM-DD
  lastAdded: string
  vaccines: ChecklistVaccine[]
}

const DUE_LEAD_DAYS = 28 // 4 weeks before travel
const NAV_BAR_HEIGHT = 56
const INITIAL_SCROLL = { x: 0, y: NAV_BAR_HEIGHT }
const WINDOW_HEIGHT = Dimensions.get('window').height

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

async function fetchChecklist(): Promise<ChecklistTrip[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select(`
      id, vaccine_id, country_id, created_at, entry_date,
      vaccines ( id, name ),
      countries ( id, code, name )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const byCountry = new Map<number, ChecklistTrip>()
  for (const item of data ?? []) {
    const cid = item.country_id
    const countryInfo = item.countries as any
    const vaccineInfo = item.vaccines as any

    if (!byCountry.has(cid)) {
      byCountry.set(cid, {
        country_id: cid,
        country_code: countryInfo?.code ?? '',
        country_name: countryInfo?.name ?? '',
        entry_date: item.entry_date ?? null,
        lastAdded: item.created_at,
        vaccines: [],
      })
    }

    const trip = byCountry.get(cid)!
    if (item.entry_date && !trip.entry_date) trip.entry_date = item.entry_date
    trip.vaccines.push({
      id: item.id,
      vaccine_id: item.vaccine_id,
      vaccine_name: vaccineInfo?.name ?? 'Unknown vaccine',
      created_at: item.created_at,
    })
    if (item.created_at > trip.lastAdded) trip.lastAdded = item.created_at
  }

  const trips = Array.from(byCountry.values())

  // Sort: entry_date trips first (soonest first), then no-date trips (latest added first)
  trips.sort((a, b) => {
    if (a.entry_date && b.entry_date) {
      return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    }
    if (a.entry_date) return -1
    if (b.entry_date) return 1
    return new Date(b.lastAdded).getTime() - new Date(a.lastAdded).getTime()
  })

  return trips
}

async function removeTrip(countryId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('user_id', user.id)
    .eq('country_id', countryId)
  if (error) throw new Error(error.message)
}

async function removeVaccineFromChecklist(id: number): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

async function markVaccineReceived(params: { id: number; vaccineId: number }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // Add to passport (ignore duplicate)
  await supabase
    .from('user_vaccines')
    .insert({ user_id: user.id, vaccine_id: params.vaccineId })
  // Remove from checklist
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', params.id)
  if (error) throw new Error(error.message)
}

export default function ChecklistScreen() {
  const queryClient = useQueryClient()
  const scrollRef = useRef<ScrollView>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [scrollReady, setScrollReady] = useState(false)

  const { data: trips = [], isLoading } = useQuery<ChecklistTrip[]>({
    queryKey: ['checklist'],
    queryFn: fetchChecklist,
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

  const removeTripMutation = useMutation({
    mutationFn: removeTrip,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist'] }),
  })

  const removeVaccineMutation = useMutation({
    mutationFn: removeVaccineFromChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
      queryClient.invalidateQueries({ queryKey: ['checklistIds'] })
    },
  })

  const markReceivedMutation = useMutation({
    mutationFn: markVaccineReceived,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
      queryClient.invalidateQueries({ queryKey: ['checklistIds'] })
      queryClient.invalidateQueries({ queryKey: ['passportIds'] })
      queryClient.invalidateQueries({ queryKey: ['passport'] })
    },
  })

  function handleCheckVaccine(item: ChecklistVaccine) {
    setChecked((prev) => new Set(prev).add(item.id))
    setTimeout(() => {
      markReceivedMutation.mutate(
        { id: item.id, vaccineId: item.vaccine_id },
        {
          onError: () => {
            setChecked((prev) => {
              const next = new Set(prev)
              next.delete(item.id)
              return next
            })
            Alert.alert('Error', 'Could not mark vaccine as received.')
          },
        },
      )
    }, 400)
  }

  async function handleShareTrip(trip: ChecklistTrip) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to share your checklist.')
        return
      }

      const { data, error } = await supabase
        .from('checklist_shares')
        .insert({
          country_id: trip.country_id,
          country_name: trip.country_name,
          country_code: trip.country_code,
          entry_date: trip.entry_date ?? null,
          vaccines: trip.vaccines.map(v => ({ vaccine_id: v.vaccine_id, vaccine_name: v.vaccine_name })),
          created_by: user.id,
        })
        .select('id')
        .single()

      if (error || !data) {
        Alert.alert('Error', 'Could not create shareable link.')
        return
      }

      const shareUrl = `https://opimus.app/share/${data.id}`

      const vaccineLines = trip.vaccines.map(v => `• ${v.vaccine_name}`).join('\n')
      const dateLines = trip.entry_date
        ? `📅 Travel date: ${formatDate(trip.entry_date)}\n⏰ Get vaccinated by: ${dueDate(trip.entry_date)}\n\n`
        : ''

      const message =
        `🌍 Vaccine Checklist — ${trip.country_name}\n` +
        dateLines +
        `Vaccines needed:\n${vaccineLines}\n\n` +
        `Tap to add to your Opimus checklist:\n${shareUrl}\n\n` +
        `— Shared via Opimus · Travel Vaccination Planner`

      Share.share({ message, title: 'My Vaccine Checklist' })
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    }
  }

  function handleRemoveTrip(trip: ChecklistTrip) {
    Alert.alert(
      `Remove trip to ${trip.country_name}?`,
      'This will remove all vaccines from your checklist for this destination.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeTripMutation.mutate(trip.country_id),
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentOffset={INITIAL_SCROLL} alwaysBounceVertical contentContainerStyle={styles.scroll} style={{ opacity: scrollReady ? 1 : 0 }}>

        {/* ── Opimus nav bar — hidden above fold, revealed on pull-down ── */}
        <View style={styles.navBar}>
          <View style={{ flex: 1 }} />
          <OpimusMenu />
        </View>

        <Text style={styles.pageTitle}>My Checklist</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : trips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No vaccines on your checklist</Text>
            <Text style={styles.emptyBody}>
              Search for a destination and tap "Add to my checklist" to build your pre-travel vaccine list.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Tap a checkbox when you've received a vaccine — it will move to your passport.
            </Text>

            {trips.map((trip) => (
              <View key={trip.country_id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View style={styles.tripHeaderText}>
                    <Text style={styles.tripTitle}>Trip: {trip.country_name}</Text>
                    {trip.entry_date ? (
                      <Text style={styles.tripDate}>
                        Date of entry: {formatDate(trip.entry_date)}
                      </Text>
                    ) : (
                      <Text style={styles.tripDate}>
                        Last added: {formatDate(trip.lastAdded)}
                      </Text>
                    )}
                    {trip.entry_date && (
                      <Text style={styles.dueNotice}>
                        Get vaccinated by {dueDate(trip.entry_date)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.tripActions}>
                    <TouchableOpacity
                      onPress={() => handleShareTrip(trip)}
                      style={styles.shareButton}
                    >
                      <Text style={styles.shareText}>⬆ Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveTrip(trip)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteText}>🗑 Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.vaccineList}>
                  {trip.vaccines.map((v) => {
                    const isChecked = checked.has(v.id)
                    return (
                      <View key={v.id} style={[styles.vaccineRow, isChecked && styles.vaccineRowChecked]}>
                        <TouchableOpacity
                          onPress={() => !isChecked && handleCheckVaccine(v)}
                          style={[styles.checkBox, isChecked && styles.checkBoxChecked]}
                          activeOpacity={0.7}
                        >
                          {isChecked && <Text style={styles.checkMark}>✓</Text>}
                        </TouchableOpacity>
                        <View style={styles.vaccineInfo}>
                          <Text style={[styles.vaccineName, isChecked && styles.vaccineNameChecked]}>
                            {v.vaccine_name}
                          </Text>
                          {trip.entry_date && !isChecked && (
                            <Text style={styles.vaccineDue}>
                              Due by {dueDate(trip.entry_date)}
                            </Text>
                          )}
                        </View>
                        {!isChecked && (
                          <TouchableOpacity onPress={() => removeVaccineMutation.mutate(v.id)}>
                            <Text style={styles.removeVaccine}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingTop: 0, gap: spacing.md, minHeight: WINDOW_HEIGHT + NAV_BAR_HEIGHT },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: NAV_BAR_HEIGHT,
    paddingHorizontal: spacing.sm,
  },
  pageTitle: { ...typography.h1, fontSize: 30, lineHeight: 38, color: colors.textPrimary, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs, marginTop: spacing.sm },
  loader: { marginTop: spacing.xl },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tripHeaderText: { flex: 1, gap: 3 },
  tripTitle: { ...typography.h3, color: colors.textPrimary },
  tripDate: { ...typography.caption, color: colors.textSecondary },
  dueNotice: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  tripActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', flexShrink: 0 },
  shareButton: { paddingTop: 2 },
  shareText: { ...typography.caption, color: colors.primary },
  deleteButton: { paddingTop: 2, flexShrink: 0 },
  deleteText: { ...typography.caption, color: colors.error },
  vaccineList: { padding: spacing.md, gap: spacing.sm },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  vaccineRowChecked: { opacity: 0.5 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  vaccineInfo: { flex: 1, gap: 2 },
  vaccineName: { ...typography.body, color: colors.textPrimary },
  vaccineNameChecked: { textDecorationLine: 'line-through', color: colors.textSecondary },
  vaccineDue: { ...typography.caption, color: colors.textMuted },
  removeVaccine: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 4 },
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
