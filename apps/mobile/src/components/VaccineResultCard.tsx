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
  onUndo: () => void
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

// Strip the level word from the start of notes to avoid "Required Required if..."
// Only applies to required/recommended — "Routine vaccines should..." reads fine as-is.
function stripLevelPrefix(notes: string, label: string): string {
  const trimmed = notes.trimStart()
  if (trimmed.toLowerCase().startsWith(label.toLowerCase())) {
    return trimmed.slice(label.length).trimStart()
  }
  return trimmed
}

export function VaccineResultCard({
  group, isInPassport, isOnChecklist,
  onAddToPassport, onAddToChecklist, onUndo, onReport,
}: VaccineResultCardProps) {
  const vaccine = group.vaccine
  const disease = vaccine?.disease
  const levelStyle = LEVEL_STYLE[group.primaryLevel]
  const rawNotes = group.sources.find((s) => s.notes)?.notes ?? null
  const primaryNotes = rawNotes && (group.primaryLevel === 'required' || group.primaryLevel === 'recommended')
    ? stripLevelPrefix(rawNotes, levelStyle.label)
    : rawNotes

  const cardStyle = isInPassport
    ? styles.cardCovered
    : isOnChecklist
      ? styles.cardPending
      : null

  const showUndo = isInPassport || isOnChecklist

  return (
    <View style={[styles.card, cardStyle]}>

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
        {isOnChecklist && !isInPassport && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>● Pending</Text>
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

      {/* ── Level badge inline with notes; second line wraps to left edge ── */}
      <Text style={styles.levelLine}>
        <Text style={[styles.inlineBadge, { color: levelStyle.text, backgroundColor: levelStyle.bg }]}>
          {' '}{levelStyle.label}{' '}
        </Text>
        {primaryNotes ? '  ' + primaryNotes : ''}
      </Text>

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

      {/* ── Action buttons (only when not yet selected) ── */}
      {!isInPassport && !isOnChecklist && (
        <>
          <Button
            label="I already got this vaccine"
            onPress={onAddToPassport}
            variant="primary"
            style={styles.btn}
          />
          <Button
            label="Add to my checklist"
            onPress={onAddToChecklist}
            variant="outline"
            style={styles.btn}
          />
        </>
      )}

      {/* ── Undo button (bottom-right when card has a selection) ── */}
      {showUndo && (
        <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
          <Text style={styles.undoText}>↩ Undo</Text>
        </TouchableOpacity>
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
  cardPending: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFE082',
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
  pendingBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  pendingBadgeText: { ...typography.caption, color: '#7B5800', fontWeight: '700' },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sourcesLabel: { ...typography.caption, color: colors.textMuted },
  sourceLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  sourcePlain: { ...typography.caption, color: colors.textSecondary },
  sourceDot: { ...typography.caption, color: colors.textMuted },
  levelLine: { ...typography.bodySmall, color: colors.textSecondary, marginVertical: spacing.xs },
  inlineBadge: { ...typography.caption, fontWeight: '700', borderRadius: 3 },
  discrepancyBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  discrepancyText: { ...typography.bodySmall, color: '#7B5800' },
  reportLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  btn: { marginTop: 0 },
  undoButton: { alignSelf: 'flex-end', paddingTop: spacing.xs },
  undoText: { ...typography.caption, color: colors.textMuted },
})
