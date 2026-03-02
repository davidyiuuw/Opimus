import React from 'react'
import {
  View, SectionList, Text, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GroupedRecommendations, TravelAdvisory } from '@opimus/types'
import { api } from '../../lib/api'
import { AdvisoryBanner } from '../../components/AdvisoryBanner'
import { VaccineResultCard } from '../../components/VaccineResultCard'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'

export default function ResultsScreen() {
  const { country } = useLocalSearchParams<{ country: string }>()
  const queryClient = useQueryClient()

  const { data: grouped, isLoading: loadingVaccines } = useQuery<GroupedRecommendations>({
    queryKey: ['recommendations', country],
    queryFn: () => api.get(`/vaccines/recommendations?country=${country}`),
  })

  const { data: advisory } = useQuery<TravelAdvisory | null>({
    queryKey: ['advisory', country],
    queryFn: () => api.get(`/advisories/${country}`),
  })

  const { data: passport = [] } = useQuery<{ vaccine_id: number }[]>({
    queryKey: ['passport'],
    queryFn: () => api.get('/user/vaccines'),
  })

  const addToPassport = useMutation({
    mutationFn: (vaccineId: number) => api.post('/user/vaccines', { vaccineId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['passport'] }),
  })

  const passportVaccineIds = new Set(passport.map((v) => v.vaccine_id))

  if (loadingVaccines) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  const sections = [
    { title: 'Required', data: grouped?.required ?? [], level: 'required' },
    { title: 'Recommended', data: grouped?.recommended ?? [], level: 'recommended' },
    { title: 'Routine', data: grouped?.routine ?? [], level: 'routine' },
  ].filter((s) => s.data.length > 0)

  return (
    <SafeAreaView style={styles.container}>
      <AdvisoryBanner advisory={advisory ?? null} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <VaccineResultCard
            recommendation={item}
            isInPassport={passportVaccineIds.has(item.vaccine_id)}
            onAddToPassport={() => addToPassport.mutate(item.vaccine_id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No vaccine recommendations found for this destination.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: { padding: spacing.lg },
  emptyText: { ...typography.body, color: colors.textSecondary },
})
