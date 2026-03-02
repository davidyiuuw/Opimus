import React from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { VaccineRecommendation } from '@opimus/types'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { borderRadius, spacing } from '../theme/spacing'
import { Button } from './ui/Button'

interface VaccineResultCardProps {
  recommendation: VaccineRecommendation
  isInPassport: boolean
  onAddToPassport: () => void
}

export function VaccineResultCard({ recommendation, isInPassport, onAddToPassport }: VaccineResultCardProps) {
  const vaccine = recommendation.vaccine
  const disease = vaccine?.disease

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{vaccine?.name ?? 'Unknown Vaccine'}</Text>
        {disease && <Text style={styles.disease}>{disease.name}</Text>}
      </View>

      {recommendation.notes && (
        <Text style={styles.notes}>{recommendation.notes}</Text>
      )}

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.source}>Source: {recommendation.source}</Text>
          <Text style={styles.synced}>
            Updated: {new Date(recommendation.last_synced_at).toLocaleDateString()}
          </Text>
        </View>

        {recommendation.source_url && (
          <TouchableOpacity onPress={() => Linking.openURL(recommendation.source_url!)}>
            <Text style={styles.link}>Learn more →</Text>
          </TouchableOpacity>
        )}
      </View>

      <Button
        label={isInPassport ? '✓ In Passport' : '+ Add to Passport'}
        onPress={onAddToPassport}
        variant={isInPassport ? 'outline' : 'primary'}
        disabled={isInPassport}
        style={styles.cta}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: { gap: 2 },
  name: { ...typography.h3, color: colors.textPrimary },
  disease: { ...typography.bodySmall, color: colors.textSecondary },
  notes: { ...typography.body, color: colors.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  meta: { gap: 2 },
  source: { ...typography.caption, color: colors.textMuted },
  synced: { ...typography.caption, color: colors.textMuted },
  link: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  cta: { marginTop: spacing.xs },
})
