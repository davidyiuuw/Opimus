import React from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { VaccineGroup, RecommendationLevel } from '@opimus/types'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { borderRadius, spacing } from '../theme/spacing'
import { Button } from './ui/Button'

interface VaccineResultCardProps {
  group: VaccineGroup
  isInPassport: boolean
  isOnChecklist: boolean
  onAddToPassport: () => void
  onAddToChecklist: () => void
  onReport: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  CDC: 'CDC',
  US_STATE_DEPT: 'US State Dept',
  COUNTRY_GOV: "Destination Gov't",
  WHO: 'WHO',
}

const LEVEL_STYLE: Record<RecommendationLevel, { bg: string; text: string; label: string }> = {
  required:        { bg: '#FFEBEE', text: '#C62828', label: 'Required' },
  recommended:     { bg: '#FFF3E0', text: '#E65100', label: 'Recommended' },
  routine:         { bg: '#E3F2FD', text: '#1565C0', label: 'Routine' },
  not_recommended: { bg: '#F5F5F5', text: '#757575', label: 'Not recommended' },
}

export function VaccineResultCard({
  group, isInPassport, isOnChecklist, onAddToPassport, onAddToChecklist, onReport,
}: VaccineResultCardProps) {
  const vaccine = group.vaccine
  const disease = vaccine?.disease
  const levelStyle = LEVEL_STYLE[group.primaryLevel]

  // Notes from the first source that has them (usually CDC)
  const primaryNotes = group.sources.find((s) => s.notes)?.notes

  return (
    <View style={[styles.card, isInPassport && styles.cardCovered]}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{vaccine?.name ?? 'Unknown Vaccine'}</Text>
          {disease && <Text style={styles.disease}>{disease.name}</Text>}
        </View>
        {isInPassport && (
          <View style={styles.coveredBadge}>
            <Text style={styles.coveredBadgeText}>✓ Up-to-date</Text>
          </View>
        )}
      </View>

      {/* ── Sources line ── */}
      <View style={styles.sourcesRow}>
        <Text style={styles.sourcesLabel}>Sources: </Text>
        {group.sources.map((src, i) => {
          const label = SOURCE_LABELS[src.source] ?? src.source
          return (
            <React.Fragment key={src.id}>
              {i > 0 && <Text style={styles.sourceDot}> · </Text>}
              {src.source_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(src.source_url!)}>
                  <Text style={styles.sourceLink}>{label} ↗</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.sourcePlain}>{label}</Text>
              )}
            </React.Fragment>
          )
        })}
      </View>

      {/* ── Level badge + notes inline ── */}
      <View style={styles.levelNotesRow}>
        <View style={[styles.levelBadge, { backgroundColor: levelStyle.bg }]}>
          <Text style={[styles.levelBadgeText, { color: levelStyle.text }]}>
            {levelStyle.label}
          </Text>
        </View>
        {primaryNotes && (
          <Text style={styles.notesText} numberOfLines={3}>{primaryNotes}</Text>
        )}
      </View>

      {/* ── Discrepancy warning ── */}
      {group.hasDiscrepancy && (
        <View style={styles.discrepancyBox}>
          <Text style={styles.discrepancyText}>
            ⚠ Sources disagree on the requirement level. Use your judgement or consult a travel doctor.
          </Text>
          <TouchableOpacity onPress={onReport}>
            <Text style={styles.reportLink}>Report issue →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Action buttons ── */}
      {!isInPassport && (
        <>
          <Button
            label="I already got this vaccine"
            onPress={onAddToPassport}
            variant="primary"
            style={styles.btn}
          />
          <Button
            label={isOnChecklist ? "✓ Added to checklist" : "Add to my checklist"}
            onPress={onAddToChecklist}
            variant="outline"
            disabled={isOnChecklist}
            style={styles.btn}
          />
        </>
      )}
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
    marginHorizontal: spacing.md,
  },
  cardCovered: {
    backgroundColor: '#F1F8F1',
    borderColor: '#A5D6A7',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { flex: 1, gap: 2 },
  name: { ...typography.h3, color: colors.textPrimary },
  disease: { ...typography.bodySmall, color: colors.textSecondary },
  coveredBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  coveredBadgeText: { ...typography.caption, color: '#2E7D32', fontWeight: '700' },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sourcesLabel: { ...typography.caption, color: colors.textMuted },
  sourceLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  sourcePlain: { ...typography.caption, color: colors.textSecondary },
  sourceDot: { ...typography.caption, color: colors.textMuted },
  levelNotesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  levelBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  levelBadgeText: { ...typography.caption, fontWeight: '700' },
  notesText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  discrepancyBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  discrepancyText: { ...typography.bodySmall, color: '#7B5800' },
  reportLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  btn: { marginTop: 0 },
})
