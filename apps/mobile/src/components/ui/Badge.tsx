import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'
import { RecommendationLevel } from '@opimus/types'

const BADGE_CONFIG: Record<RecommendationLevel, { bg: string; text: string; label: string }> = {
  required: { bg: '#FFEBEE', text: colors.required, label: 'Required' },
  recommended: { bg: '#FFF3E0', text: colors.recommended, label: 'Recommended' },
  routine: { bg: '#E3F2FD', text: colors.routine, label: 'Routine' },
  not_recommended: { bg: '#F5F5F5', text: colors.textSecondary, label: 'Not Recommended' },
}

interface BadgeProps {
  level: RecommendationLevel
}

export function RecommendationBadge({ level }: BadgeProps) {
  const config = BADGE_CONFIG[level]
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: { ...typography.label },
})
