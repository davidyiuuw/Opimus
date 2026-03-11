import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, Modal, ScrollView,
  TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Keyboard, Platform, Dimensions, InteractionManager,
  StyleSheet, ActivityIndicator, Share, Linking,
  NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { OpimusMenu } from '../../../components/OpimusMenu'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { borderRadius, spacing } from '../../../theme/spacing'

const IDK_POPUP_KEY = 'idk_popup_count'

interface Country {
  id: number
  code: string
  name: string
  region: string | null
}

interface Kid {
  id: string
  name: string
  age: string
}

type TravelerOption = 'myself' | 'family' | 'someone_else'

const TRAVELER_OPTIONS: { value: TravelerOption; label: string }[] = [
  { value: 'myself',       label: 'Myself' },
  { value: 'family',       label: 'Family' },
  { value: 'someone_else', label: 'Someone else' },
]

async function fetchAllCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, code, name, region')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

// Height of the Opimus nav bar that sits above the visible scroll area on mount
const NAV_BAR_HEIGHT = 56
const INITIAL_SCROLL = { x: 0, y: NAV_BAR_HEIGHT }
const WINDOW_HEIGHT = Dimensions.get('window').height

export default function PlanScreen() {
  const scrollRef = useRef<ScrollView>(null)
  const [scrollReady, setScrollReady] = useState(false)
  const [countryModalVisible, setCountryModalVisible] = useState(false)
  const [dateModalVisible, setDateModalVisible] = useState(false)
  const [showUnknownModal, setShowUnknownModal] = useState(false)
  const [filter, setFilter] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [entryDate, setEntryDate] = useState<Date | null>(null)
  const [pendingDate, setPendingDate] = useState<Date>(new Date())
  const [travelers, setTravelers] = useState<TravelerOption | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [dateUnknown, setDateUnknown] = useState(false)

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

  const { data: countries = [], isLoading } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: fetchAllCountries,
    staleTime: 1000 * 60 * 30,
  })

  const filterLower = filter.toLowerCase().trim()
  const filtered = filterLower.length === 0
    ? countries
    : countries.filter(c => {
        const words = [
          ...c.name.toLowerCase().split(/\s+/),
          ...(c.region ?? '').toLowerCase().split(/\s+/),
        ]
        return words.some(w => w.startsWith(filterLower))
      })

  function handleSelectCountry(country: Country) {
    setSelectedCountry(country)
    setCountryModalVisible(false)
    setFilter('')
  }

  async function handleDateUnknown() {
    if (dateUnknown) {
      // Toggle off — just deselect, let user pick a date normally
      setDateUnknown(false)
      return
    }
    // Toggle on — clear any selected date
    setDateUnknown(true)
    setEntryDate(null)
    // Show popup if it hasn't been shown twice yet
    const raw = await AsyncStorage.getItem(IDK_POPUP_KEY)
    const count = parseInt(raw ?? '0', 10)
    if (count < 2) {
      setShowUnknownModal(true)
      await AsyncStorage.setItem(IDK_POPUP_KEY, String(count + 1))
    }
  }

  function handleTravelerSelect(option: TravelerOption) {
    setTravelers(option)
    if (option === 'someone_else') {
      Share.share({
        message:
          "I'm using Opimus to plan my travel vaccinations. Download the app and travel prepared! https://opimus.app",
        title: 'Opimus — Travel Vaccination Planner',
      })
    }
    if (option !== 'family') setKids([])
  }

  function addKid() {
    setKids(prev => [...prev, { id: Date.now().toString(), name: '', age: '' }])
  }

  function updateKid(id: string, field: 'name' | 'age', value: string) {
    setKids(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k))
  }

  function removeKid(id: string) {
    setKids(prev => prev.filter(k => k.id !== id))
  }

  function handleSeeRequirements() {
    if (!selectedCountry) return
    AsyncStorage.setItem(
      'lastSearchedCountry',
      JSON.stringify({ code: selectedCountry.code, name: selectedCountry.name }),
    )
    const dateQuery = entryDate && !dateUnknown
      ? `?entryDate=${entryDate.toISOString().split('T')[0]}`
      : ''
    router.push(`/results/${selectedCountry.code}${dateQuery}`)
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentOffset={INITIAL_SCROLL}
        alwaysBounceVertical
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        style={{ opacity: scrollReady ? 1 : 0 }}
      >
        {/* ── Opimus nav bar — lives above the hero, revealed on pull-down ── */}
        <View style={styles.navBar}>
          <View style={{ flex: 1 }} />
          <OpimusMenu />
        </View>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heading}>Make a plan to{'\n'}get protected</Text>
          <Text style={styles.subheading}>
            Find what vaccines you need before your trip.
          </Text>
        </View>

        {/* ── Where ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Where are you traveling to?</Text>
          <TouchableOpacity
            style={[styles.selectButton, selectedCountry && styles.selectButtonFilled]}
            onPress={() => setCountryModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectButtonText, selectedCountry && styles.selectButtonTextFilled]}>
              {selectedCountry?.name ?? 'Select a country'}
            </Text>
            <Text style={styles.selectArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* ── When ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>When are you entering the country?</Text>
          <TouchableOpacity
            style={[styles.selectButton, entryDate && styles.selectButtonFilled]}
            onPress={() => {
              setPendingDate(entryDate ?? new Date())
              setDateModalVisible(true)
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectButtonText, entryDate && styles.selectButtonTextFilled]}>
              {entryDate ? formatDate(entryDate) : 'Select a date'}
            </Text>
            <Text style={styles.selectArrow}>📅</Text>
          </TouchableOpacity>

          {/* "I don't know yet" toggle bubble */}
          <TouchableOpacity
            style={[styles.unknownBubble, dateUnknown && styles.unknownBubbleActive]}
            onPress={handleDateUnknown}
            activeOpacity={0.7}
          >
            <Text style={[styles.unknownBubbleText, dateUnknown && styles.unknownBubbleTextActive]}>
              I don't know yet
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Who ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Who are you traveling with?</Text>
          <View style={styles.travelerRow}>
            {TRAVELER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.travelerButton,
                  travelers === opt.value && styles.travelerButtonActive,
                ]}
                onPress={() => handleTravelerSelect(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.travelerButtonText,
                  travelers === opt.value && styles.travelerButtonTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Family — kids section */}
          {travelers === 'family' && (
            <View style={styles.kidsSection}>
              <Text style={styles.kidsSectionLabel}>Children traveling</Text>

              {kids.map((kid, index) => (
                <View key={kid.id} style={styles.kidRow}>
                  <Text style={styles.kidIndex}>Child {index + 1}</Text>
                  <View style={styles.kidFields}>
                    <TextInput
                      style={[styles.kidInput, styles.kidNameInput]}
                      placeholder="Name (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={kid.name}
                      onChangeText={(v) => updateKid(kid.id, 'name', v)}
                      returnKeyType="next"
                    />
                    <TextInput
                      style={[styles.kidInput, styles.kidAgeInput]}
                      placeholder="Age"
                      placeholderTextColor={colors.textMuted}
                      value={kid.age}
                      onChangeText={(v) => updateKid(kid.id, 'age', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={2}
                      returnKeyType="done"
                    />
                    <TouchableOpacity onPress={() => removeKid(kid.id)} style={styles.removeKid}>
                      <Text style={styles.removeKidText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity onPress={addKid} style={styles.addKidButton}>
                <Text style={styles.addKidText}>+ Add a child</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── CTA ── */}
        <Button
          label="See Vaccine Requirements →"
          onPress={handleSeeRequirements}
          disabled={!selectedCountry || (!entryDate && !dateUnknown) || !travelers}
          style={styles.cta}
        />

      </ScrollView>

      {/* ── "I don't know yet" popup ── */}
      <Modal
        visible={showUnknownModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnknownModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Plan ahead!</Text>
            <Text style={styles.popupBody}>
              Most vaccines take about 2 weeks to work. The sooner you know your travel dates, the better!
            </Text>
            <Button
              label="I understand"
              onPress={() => setShowUnknownModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* ── Country picker modal ── */}
      <Modal
        visible={countryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Country</Text>
            <TouchableOpacity onPress={() => { setCountryModalVisible(false); setFilter('') }}>
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
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.countryName}>{item.name}</Text>
                  {item.region && <Text style={styles.region}>{item.region}</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>We don't have data for this destination yet</Text>
                  <Text style={styles.emptyBody}>
                    We're sorry — we're still expanding our coverage. For the most up-to-date vaccine recommendations, please visit the CDC Travelers' Health website.
                  </Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://wwwnc.cdc.gov/travel/')}>
                    <Text style={styles.emptyLink}>Visit CDC Travelers' Health ↗</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Date picker modal ── */}
      <Modal
        visible={dateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.dateModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Entry Date</Text>
            <TouchableOpacity onPress={() => {
              setEntryDate(pendingDate)
              setDateUnknown(false)
              setDateModalVisible(false)
            }}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pendingDate}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_event, date) => { if (date) setPendingDate(date) }}
            style={styles.datePicker}
            accentColor={colors.primary}
          />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg, minHeight: WINDOW_HEIGHT + NAV_BAR_HEIGHT },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: NAV_BAR_HEIGHT,
  },
  hero: { gap: spacing.sm, paddingBottom: spacing.sm },
  heading: { fontSize: 36, fontWeight: '700', lineHeight: 44, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  section: { gap: spacing.sm },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  selectButtonFilled: { borderColor: colors.primary },
  selectButtonText: { ...typography.body, color: colors.textMuted },
  selectButtonTextFilled: { color: colors.textPrimary },
  selectArrow: { fontSize: 14, color: colors.textMuted },
  // "I don't know yet" bubble
  unknownBubble: {
    alignSelf: 'flex-start',
    height: 34,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  unknownBubbleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  unknownBubbleText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  unknownBubbleTextActive: { color: '#fff' },
  // Popup overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popupTitle: { ...typography.h3, color: colors.textPrimary },
  popupBody: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  travelerRow: { flexDirection: 'row', gap: spacing.sm },
  travelerButton: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  travelerButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  travelerButtonText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  travelerButtonTextActive: { color: '#fff' },
  // Family / kids
  kidsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  kidsSectionLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
  kidRow: { gap: spacing.xs },
  kidIndex: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  kidFields: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  kidInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  kidNameInput: { flex: 1 },
  kidAgeInput: { width: 60 },
  removeKid: { padding: 4 },
  removeKidText: { fontSize: 14, color: colors.textMuted },
  addKidButton: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addKidText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  cta: { marginTop: spacing.sm },
  // Country modal
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
  countryRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  countryName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  region: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },
  empty: { padding: spacing.lg, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptyBody: { ...typography.body, color: colors.textSecondary },
  emptyLink: { ...typography.body, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  // Date modal
  dateModalContainer: { flex: 1, backgroundColor: colors.background },
  datePicker: { marginHorizontal: spacing.md },
})
