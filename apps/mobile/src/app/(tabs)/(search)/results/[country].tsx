import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import {
  View, SectionList, Text, StyleSheet,
  Alert, ActivityIndicator, TouchableOpacity, Linking,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  VaccineRecommendation, VaccineGroup, VaccineQuestion,
  TravelAdvisory, GroupedRecommendations, RecommendationLevel,
} from '@opimus/types'
import { supabase } from '../../../../lib/supabase'
import { AdvisoryBanner } from '../../../../components/AdvisoryBanner'
import { VaccineResultCard } from '../../../../components/VaccineResultCard'
import { colors } from '../../../../theme/colors'
import { typography } from '../../../../theme/typography'
import { spacing } from '../../../../theme/spacing'
import { useLayoutEffect } from 'react'

const LEVEL_PRIORITY: Record<RecommendationLevel, number> = {
  required: 3, recommended: 2, routine: 1, not_recommended: 0,
}

function mostRestrictive(levels: RecommendationLevel[]): RecommendationLevel {
  return levels.reduce((a, b) => LEVEL_PRIORITY[a] >= LEVEL_PRIORITY[b] ? a : b)
}

async function fetchRecommendations(countryCode: string): Promise<GroupedRecommendations> {
  const { data: country, error: countryError } = await supabase
    .from('countries')
    .select('id')
    .eq('code', countryCode.toUpperCase())
    .single()

  if (countryError || !country) return { required: [], recommended: [], routine: [] }

  const [{ data, error }, { data: questionsData }] = await Promise.all([
    supabase
      .from('vaccine_recommendations')
      .select(`
        id, vaccine_id, level, notes, source, source_url, last_synced_at,
        vaccines ( id, name, manufacturer, doses, notes, min_age_years,
          diseases ( id, slug, name )
        )
      `)
      .eq('country_id', country.id)
      .neq('level', 'not_recommended'),
    supabase
      .from('vaccine_questions')
      .select('*')
      .eq('country_id', country.id),
  ])

  if (error) throw new Error(error.message)

  const questionsByVaccine = new Map<number, VaccineQuestion>()
  for (const q of questionsData ?? []) {
    questionsByVaccine.set(q.vaccine_id, q as VaccineQuestion)
  }

  const recs: VaccineRecommendation[] = (data ?? []).map((r: any) => ({
    id: r.id,
    country_id: country.id,
    vaccine_id: r.vaccine_id,
    level: r.level,
    notes: r.notes,
    source: r.source,
    source_url: r.source_url,
    last_synced_at: r.last_synced_at,
    vaccine: r.vaccines
      ? { ...r.vaccines, disease: r.vaccines.diseases ?? undefined }
      : undefined,
  }))

  const byVaccine = new Map<number, VaccineRecommendation[]>()
  for (const rec of recs) {
    const existing = byVaccine.get(rec.vaccine_id) ?? []
    byVaccine.set(rec.vaccine_id, [...existing, rec])
  }

  const groups: VaccineGroup[] = Array.from(byVaccine.entries()).map(([vaccine_id, sources]) => {
    const levels = sources.map((s) => s.level)
    const primaryLevel = mostRestrictive(levels)
    return {
      vaccine_id,
      vaccine: sources[0].vaccine,
      primaryLevel,
      sources,
      hasDiscrepancy: new Set(levels).size > 1,
      question: questionsByVaccine.get(vaccine_id),
    }
  })

  return {
    required: groups.filter((g) => g.primaryLevel === 'required'),
    recommended: groups.filter((g) => g.primaryLevel === 'recommended'),
    routine: groups.filter((g) => g.primaryLevel === 'routine'),
  }
}

async function fetchAdvisory(countryCode: string): Promise<TravelAdvisory | null> {
  const { data: country } = await supabase
    .from('countries').select('id').eq('code', countryCode.toUpperCase()).single()
  if (!country) return null
  const { data } = await supabase
    .from('travel_advisories').select('*')
    .eq('country_id', country.id)
    .eq('source', 'state_dept')
    .maybeSingle()
  return data ?? null
}

async function fetchCountryName(countryCode: string): Promise<string> {
  const { data } = await supabase
    .from('countries').select('name').eq('code', countryCode.toUpperCase()).single()
  return data?.name ?? countryCode
}

async function fetchCountryId(countryCode: string): Promise<number | null> {
  const { data } = await supabase
    .from('countries').select('id').eq('code', countryCode.toUpperCase()).single()
  return data?.id ?? null
}

async function fetchPreferences(): Promise<{ detail_level: 'essential' | 'full' | null; risk_tolerance: 'all' | 'required_only' | null; date_of_birth: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { detail_level: null, risk_tolerance: null, date_of_birth: null }
  const { data } = await supabase
    .from('users')
    .select('detail_level, risk_tolerance, date_of_birth')
    .eq('id', user.id)
    .single()
  return {
    detail_level: data?.detail_level ?? null,
    risk_tolerance: data?.risk_tolerance ?? null,
    date_of_birth: data?.date_of_birth ?? null,
  }
}

function computeAge(dob: string): number {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

async function fetchPassportIds(): Promise<{ vaccine_id: number; administered_at: string | null }[]> {
  const { data } = await supabase.from('user_vaccines').select('vaccine_id, administered_at')
  return data ?? []
}

async function fetchChecklistIds(countryCode: string): Promise<{ vaccine_id: number }[]> {
  const { data: country } = await supabase
    .from('countries').select('id').eq('code', countryCode.toUpperCase()).single()
  if (!country) return []
  const { data } = await supabase
    .from('checklist_items').select('vaccine_id').eq('country_id', country.id)
  return data ?? []
}

async function addToPassport(vaccineId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('user_vaccines').insert({ user_id: user.id, vaccine_id: vaccineId })
  if (error) throw new Error(error.message)
}

async function addToChecklist(params: { vaccineId: number; countryId: number; entryDate?: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('checklist_items')
    .insert({
      user_id: user.id,
      country_id: params.countryId,
      vaccine_id: params.vaccineId,
      entry_date: params.entryDate ?? null,
    })
  if (error && error.code !== '23505') throw new Error(error.message)
}

async function removeFromPassport(vaccineId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('user_vaccines')
    .delete().eq('user_id', user.id).eq('vaccine_id', vaccineId)
  if (error) throw new Error(error.message)
}

async function removeFromChecklist(params: { vaccineId: number; countryId: number }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('user_id', user.id)
    .eq('country_id', params.countryId)
    .eq('vaccine_id', params.vaccineId)
  if (error) throw new Error(error.message)
}

async function reportDiscrepancy(params: { countryId: number; vaccineId: number }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('discrepancy_reports')
    .insert({ user_id: user.id, country_id: params.countryId, vaccine_id: params.vaccineId })
  if (error) throw new Error(error.message)
}

export default function ResultsScreen() {
  const { country, entryDate } = useLocalSearchParams<{ country: string; entryDate?: string }>()
  const queryClient = useQueryClient()
  const navigation = useNavigation()

  const { data: countryName } = useQuery({
    queryKey: ['countryName', country],
    queryFn: () => fetchCountryName(country),
  })

  const { data: countryId, isLoading: loadingCountryId } = useQuery({
    queryKey: ['countryId', country],
    queryFn: () => fetchCountryId(country),
  })

  useLayoutEffect(() => {
    if (countryName) navigation.setOptions({ title: countryName })
  }, [countryName, navigation])

  const { data: grouped, isLoading: loadingVaccines } = useQuery<GroupedRecommendations>({
    queryKey: ['recommendations', country],
    queryFn: () => fetchRecommendations(country),
  })

  const { data: advisory } = useQuery<TravelAdvisory | null>({
    queryKey: ['advisory', country],
    queryFn: () => fetchAdvisory(country),
  })

  const { data: passportIds = [] } = useQuery({
    queryKey: ['passportIds'],
    queryFn: fetchPassportIds,
  })

  const { data: checklistIds = [] } = useQuery({
    queryKey: ['checklistIds', country],
    queryFn: () => fetchChecklistIds(country),
  })

  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: fetchPreferences,
  })

  const addPassportMutation = useMutation({
    mutationFn: addToPassport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passportIds'] })
      queryClient.invalidateQueries({ queryKey: ['passport'] })
    },
  })

  const addChecklistMutation = useMutation({
    mutationFn: addToChecklist,
    onMutate: async ({ vaccineId }) => {
      await queryClient.cancelQueries({ queryKey: ['checklistIds', country] })
      const prev = queryClient.getQueryData<{ vaccine_id: number }[]>(['checklistIds', country]) ?? []
      queryClient.setQueryData(['checklistIds', country], [...prev, { vaccine_id: vaccineId }])
      return { prev }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['checklistIds', country], context?.prev)
      Alert.alert('Could not add to checklist', 'Please try again.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistIds', country] })
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    },
  })

  const undoPassportMutation = useMutation({
    mutationFn: removeFromPassport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passportIds'] })
      queryClient.invalidateQueries({ queryKey: ['passport'] })
    },
  })

  const undoChecklistMutation = useMutation({
    mutationFn: removeFromChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistIds', country] })
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    },
  })

  const reportMutation = useMutation({
    mutationFn: reportDiscrepancy,
    onSuccess: () => {
      Alert.alert('Report Submitted', 'Thank you — this will be reviewed and corrected if needed.')
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  function handleReport(vaccineId: number) {
    if (!countryId) return
    Alert.alert(
      'Report Data Issue',
      "Flag this vaccine's recommendation sources as inconsistent or incorrect?",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit Report', onPress: () => reportMutation.mutate({ countryId, vaccineId }) },
      ],
    )
  }

  function handleUndo(vaccineId: number) {
    if (passportVaccineIds.has(vaccineId)) {
      undoPassportMutation.mutate(vaccineId)
    } else if (checklistVaccineIds.has(vaccineId) && countryId) {
      undoChecklistMutation.mutate({ vaccineId, countryId })
    }
  }

  const passportVaccineIds = new Set(passportIds.map((v) => v.vaccine_id))
  const passportDates = new Map(passportIds.map((v) => [v.vaccine_id, v.administered_at]))
  const checklistVaccineIds = new Set(checklistIds.map((v) => v.vaccine_id))

  if (loadingVaccines || loadingCountryId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  const showDetails = preferences?.detail_level !== 'essential'
  const hideRoutine = preferences?.risk_tolerance === 'required_only'
  const userAge = preferences?.date_of_birth ? computeAge(preferences.date_of_birth) : null

  const sections = [
    { title: 'Required', data: grouped?.required ?? [] },
    { title: 'Recommended', data: grouped?.recommended ?? [] },
    ...(!hideRoutine ? [{ title: 'Routine', data: grouped?.routine ?? [] }] : []),
  ].filter((s) => s.data.length > 0)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.vaccine_id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={<AdvisoryBanner advisory={advisory ?? null} />}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <VaccineResultCard
            group={item}
            isInPassport={passportVaccineIds.has(item.vaccine_id)}
            isOnChecklist={checklistVaccineIds.has(item.vaccine_id)}
            administeredAt={passportDates.get(item.vaccine_id) ?? null}
            showDetails={showDetails}
            userAge={userAge}
            onAddToPassport={() => addPassportMutation.mutate(item.vaccine_id)}
            onAddToChecklist={() => {
              if (countryId) addChecklistMutation.mutate({ vaccineId: item.vaccine_id, countryId, entryDate: entryDate ?? undefined })
            }}
            onUndo={() => handleUndo(item.vaccine_id)}
            onReport={() => handleReport(item.vaccine_id)}
          />
        )}
        ListFooterComponent={
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Vaccine recommendations are curated by a community-practice pharmacist and tailored to your risk tolerance. They are based on CDC guidance and clinical judgment, and are not a substitute for personalized medical advice. Always consult your healthcare provider before travel.
            </Text>
          </View>
        }
        ListEmptyComponent={
          countryId == null ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>We don't have data for this destination yet</Text>
              <Text style={styles.emptyBody}>
                We're sorry — {countryName ?? 'this country'} isn't in our database yet. For the most up-to-date vaccine recommendations, please visit the CDC Travelers' Health website.
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://wwwnc.cdc.gov/travel/')}>
                <Text style={styles.emptyLink}>Visit CDC Travelers' Health ↗</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No vaccine recommendations</Text>
              <Text style={styles.emptyBody}>
                The CDC has no specific vaccine recommendations for {countryName ?? 'this destination'} beyond your routine vaccinations.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: spacing.xl },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  empty: { padding: spacing.lg, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptyBody: { ...typography.body, color: colors.textSecondary },
  emptyLink: { ...typography.body, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  disclaimer: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
})
