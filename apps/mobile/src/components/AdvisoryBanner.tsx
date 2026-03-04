import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { TravelAdvisory, ADVISORY_LABELS, ADVISORY_COLORS, ADVISORY_DESCRIPTIONS } from '@opimus/types'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface AdvisoryBannerProps {
  advisory: TravelAdvisory | null
}

export function AdvisoryBanner({ advisory }: AdvisoryBannerProps) {
  if (!advisory) return null

  const bgColor = ADVISORY_COLORS[advisory.level]
  const label = ADVISORY_LABELS[advisory.level]
  const description = ADVISORY_DESCRIPTIONS[advisory.level]

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
      {advisory.summary && <Text style={styles.summary}>{advisory.summary}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: { ...typography.body, fontWeight: '700', color: '#fff' },
  description: { ...typography.bodySmall, color: 'rgba(255,255,255,0.95)' },
  summary: { ...typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
})
