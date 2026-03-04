import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState } from 'react'
import {
  View, Text, TextInput, FlatList, Modal,
  TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Keyboard, Platform,
  StyleSheet,  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

interface Country {
  id: number
  code: string
  name: string
  region: string | null
}

async function fetchAllCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, code, name, region')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export default function SearchScreen() {
  const [modalVisible, setModalVisible] = useState(false)
  const [filter, setFilter] = useState('')

  const { data: countries = [], isLoading } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: fetchAllCountries,
    staleTime: 1000 * 60 * 30,
  })

  const filtered = filter.trim().length === 0
    ? countries
    : countries.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (c.region ?? '').toLowerCase().includes(filter.toLowerCase())
      )

  function handleSelect(country: Country) {
    setModalVisible(false)
    setFilter('')
    router.push(`/results/${country.code}`)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.heading}>Where are you{'\n'}traveling to?</Text>
        <Text style={styles.subheading}>
          See vaccine requirements and travel advisories for your destination.
        </Text>

        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dropdownButtonText}>Select a country</Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Country</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setFilter('') }}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.filterInput}
                value={filter}
                onChangeText={setFilter}
                placeholder="Search countries..."
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </TouchableWithoutFeedback>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryRow}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.countryName}>{item.name}</Text>
                  {item.region && (
                    <Text style={styles.region}>{item.region}</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No countries found</Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroSection: { padding: spacing.lg, gap: spacing.md },
  heading: { ...typography.h1, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  dropdownButtonText: { ...typography.body, color: colors.textMuted },
  dropdownArrow: { fontSize: 16, color: colors.primary },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalClose: { ...typography.body, color: colors.primary, fontWeight: '600' },
  searchRow: { padding: spacing.md, paddingTop: spacing.sm },
  filterInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  loader: { marginTop: spacing.xxl },
  countryRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countryName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  region: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },
  empty: { padding: spacing.lg },
  emptyText: { ...typography.body, color: colors.textSecondary },
})
