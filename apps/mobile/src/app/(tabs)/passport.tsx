import React from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserVaccine } from '@opimus/types'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

export default function PassportScreen() {
  const queryClient = useQueryClient()

  const { data: entries = [], isLoading } = useQuery<UserVaccine[]>({
    queryKey: ['passport'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return []
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/user/vaccines`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      return res.json()
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/user/vaccines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['passport'] }),
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💉</Text>
          <Text style={styles.emptyTitle}>No vaccines logged yet</Text>
          <Text style={styles.emptyBody}>
            Search for a destination to see what vaccines you need, then add them to your passport.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.vaccineName}>{item.vaccine?.name ?? 'Vaccine'}</Text>
                <Text style={styles.diseaseName}>{item.vaccine?.disease?.name}</Text>
              </View>
              <Text style={styles.checkmark}>✅</Text>
            </View>

            {item.administered_at && (
              <Text style={styles.date}>
                Received: {new Date(item.administered_at).toLocaleDateString()}
              </Text>
            )}

            <View style={styles.docRow}>
              {item.documents && item.documents.length > 0 ? (
                <Text style={styles.docAttached}>📄 {item.documents.length} document(s) uploaded</Text>
              ) : (
                <TouchableOpacity onPress={() => router.push(`/passport/upload?vaccineId=${item.id}`)}>
                  <Text style={styles.uploadLink}>Upload proof →</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => removeMutation.mutate(item.id)}>
                <Text style={styles.remove}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vaccineName: { ...typography.h3, color: colors.textPrimary },
  diseaseName: { ...typography.bodySmall, color: colors.textSecondary },
  checkmark: { fontSize: 20 },
  date: { ...typography.bodySmall, color: colors.textSecondary },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docAttached: { ...typography.bodySmall, color: colors.success },
  uploadLink: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  remove: { fontSize: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
})
