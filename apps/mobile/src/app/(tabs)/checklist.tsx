import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
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
  lastAdded: string
  vaccines: ChecklistVaccine[]
}

async function fetchChecklist(): Promise<ChecklistTrip[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select(`
      id, vaccine_id, country_id, created_at,
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
        lastAdded: item.created_at,
        vaccines: [],
      })
    }

    const trip = byCountry.get(cid)!
    trip.vaccines.push({
      id: item.id,
      vaccine_id: item.vaccine_id,
      vaccine_name: vaccineInfo?.name ?? 'Unknown vaccine',
      created_at: item.created_at,
    })
    if (item.created_at > trip.lastAdded) trip.lastAdded = item.created_at
  }

  return Array.from(byCountry.values())
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

export default function ChecklistScreen() {
  const queryClient = useQueryClient()

  const { data: trips = [], isLoading } = useQuery<ChecklistTrip[]>({
    queryKey: ['checklist'],
    queryFn: fetchChecklist,
  })

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (trips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No vaccines on your checklist</Text>
          <Text style={styles.emptyBody}>
            Search for a destination and tap "Add to my checklist" to build your pre-travel vaccine list.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          Bring this list to your pharmacy or travel clinic.
        </Text>

        {trips.map((trip) => (
          <View key={trip.country_id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View>
                <Text style={styles.tripTitle}>Trip: {trip.country_name}</Text>
                <Text style={styles.tripDate}>
                  Last added: {new Date(trip.lastAdded).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveTrip(trip)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>🗑 Remove trip</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.vaccineList}>
              {trip.vaccines.map((v) => (
                <View key={v.id} style={styles.vaccineRow}>
                  <Text style={styles.checkBox}>☐</Text>
                  <Text style={styles.vaccineName}>{v.vaccine_name}</Text>
                  <TouchableOpacity onPress={() => removeVaccineMutation.mutate(v.id)}>
                    <Text style={styles.removeVaccine}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.md, gap: spacing.md },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
  },
  tripTitle: { ...typography.h3, color: colors.textPrimary },
  tripDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  deleteButton: { paddingTop: 2 },
  deleteText: { ...typography.caption, color: colors.error },
  vaccineList: { padding: spacing.md, gap: spacing.sm },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkBox: { fontSize: 18, color: colors.textSecondary },
  vaccineName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  removeVaccine: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
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
