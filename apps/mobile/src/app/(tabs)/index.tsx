import React, { useState } from 'react'
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { CountrySearchResult } from '@opimus/types'
import { api } from '../../lib/api'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

export default function SearchScreen() {
  const [query, setQuery] = useState('')

  const { data: results = [] } = useQuery<CountrySearchResult[]>({
    queryKey: ['countries', query],
    queryFn: () => api.get(`/countries?search=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 10,
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.heading}>Where are you{'\n'}traveling to?</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search country..."
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
        />
      </View>

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => {
                setQuery('')
                router.push(`/results/${item.code}`)
              }}
            >
              <Text style={styles.countryName}>{item.name}</Text>
              {item.region && (
                <Text style={styles.region}>{item.region}</Text>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {query.length >= 2 && results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No countries found for "{query}"</Text>
        </View>
      )}

      {query.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Type a country name to see vaccine requirements and travel advisories from the CDC and U.S. State Department.
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroSection: { padding: spacing.lg, gap: spacing.md },
  heading: { ...typography.h1, color: colors.textPrimary },
  searchInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  resultRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  countryName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  region: { ...typography.bodySmall, color: colors.textSecondary },
  separator: { height: 1, backgroundColor: colors.border },
  empty: { padding: spacing.lg },
  emptyText: { ...typography.body, color: colors.textSecondary },
  hint: { padding: spacing.lg },
  hintText: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
})
