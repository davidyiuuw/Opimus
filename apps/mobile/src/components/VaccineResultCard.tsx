import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { VaccineGroup, VaccineQuestion, RecommendationLevel } from '@opimus/types'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { borderRadius, spacing } from '../theme/spacing'
import { Button } from './ui/Button'

interface VaccineResultCardProps {
  group: VaccineGroup
  isInPassport: boolean
  isOnChecklist: boolean
  administeredAt?: string | null
  showDetails?: boolean
  userAge?: number | null
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

const LEVEL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  required:           { bg: '#FFEBEE', text: '#C62828', label: 'Required' },
  recommended:        { bg: '#FFF3E0', text: '#E65100', label: 'Recommended' },
  highly_recommended: { bg: '#FBE9E7', text: '#BF360C', label: 'Highly Recommended' },
  optional:           { bg: '#F5F5F5', text: '#757575', label: 'Optional' },
  routine:            { bg: '#E3F2FD', text: '#1565C0', label: 'Routine' },
  not_recommended:    { bg: '#F5F5F5', text: '#757575', label: 'Not recommended' },
}

function stripLevelPrefix(notes: string, label: string): string {
  const trimmed = notes.trimStart()
  if (trimmed.toLowerCase().startsWith(label.toLowerCase())) {
    return trimmed.slice(label.length).trimStart()
  }
  return trimmed
}

function intervalToText(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365
    return years === 1 ? '1 year' : `${years} years`
  }
  if (days % 30 === 0) {
    const months = days / 30
    return months === 1 ? '1 month' : `${months} months`
  }
  return `${days} days`
}

export function VaccineResultCard({
  group, isInPassport, isOnChecklist, administeredAt,
  showDetails = true, userAge,
  onAddToPassport, onAddToChecklist, onUndo, onReport,
}: VaccineResultCardProps) {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null)

  const vaccine = group.vaccine
  const disease = vaccine?.disease
  const question: VaccineQuestion | undefined = group.question

  // Resolve display level based on question answer
  const displayLevel: string = answer === 'yes'
    ? (question?.yes_level ?? group.primaryLevel)
    : answer === 'no'
      ? (question?.no_level ?? group.primaryLevel)
      : group.primaryLevel

  const levelStyle = LEVEL_STYLE[displayLevel] ?? LEVEL_STYLE['recommended']
  const rawNotes = group.sources.find((s) => s.notes)?.notes ?? null

  const primaryNotes = group.primaryLevel === 'routine'
    ? 'All travelers should be up-to-date on all routine vaccines.'
    : rawNotes && (group.primaryLevel === 'required' || group.primaryLevel === 'recommended')
      ? stripLevelPrefix(rawNotes, LEVEL_STYLE[group.primaryLevel]?.label ?? '')
      : rawNotes

  // Booster / up-to-date logic
  const boosterIntervalDays = vaccine?.booster_interval_days ?? null
  const needsBooster = isInPassport
    && boosterIntervalDays !== null
    && administeredAt != null
    && (Date.now() - new Date(administeredAt).getTime()) >= boosterIntervalDays * 24 * 60 * 60 * 1000
  const isUpToDate = isInPassport && !needsBooster

  // Age eligibility
  const minAge = vaccine?.min_age_years ?? null
  const isAgeIneligible = userAge != null && minAge != null && userAge < minAge

  const cardStyle = needsBooster
    ? styles.cardBoosterDue
    : isUpToDate
      ? styles.cardCovered
      : isOnChecklist
        ? styles.cardPending
        : null

  const showUndo = isInPassport || isOnChecklist

  function toggleAnswer(picked: 'yes' | 'no') {
    setAnswer((prev) => (prev === picked ? null : picked))
  }

  return (
    <View style={[styles.card, cardStyle]}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{vaccine?.name ?? 'Unknown Vaccine'}</Text>
          {disease && <Text style={styles.disease}>{disease.name}</Text>}
        </View>
        {needsBooster && (
          <View style={styles.boosterDueBadge}>
            <Text style={styles.boosterDueBadgeText}>↻ Booster due</Text>
          </View>
        )}
        {isUpToDate && !needsBooster && (
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
      {showDetails && (
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
      )}

      {/* ── Level badge + notes; undo inline when no discrepancy ── */}
      <View style={showUndo && (!showDetails || !group.hasDiscrepancy) ? styles.levelRow : null}>
        <Text style={[styles.levelLine, showUndo && (!showDetails || !group.hasDiscrepancy) && styles.levelLineFlex]}>
          <Text style={[styles.inlineBadge, { color: levelStyle.text, backgroundColor: levelStyle.bg }]}>
            {' '}{levelStyle.label}{' '}
          </Text>
          {showDetails && primaryNotes ? '  ' + primaryNotes : ''}
        </Text>
        {showUndo && (!showDetails || !group.hasDiscrepancy) && (
          <TouchableOpacity onPress={onUndo} style={styles.undoInline}>
            <Text style={styles.undoText}>↩ Undo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Contextual question ── */}
      {question && showDetails && (
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{question.question_text}</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => toggleAnswer('yes')}
              style={[styles.toggleBtn, answer === 'yes' && styles.toggleBtnYes]}
            >
              <Text style={[styles.toggleBtnText, answer === 'yes' && styles.toggleBtnTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleAnswer('no')}
              style={[styles.toggleBtn, answer === 'no' && styles.toggleBtnNo]}
            >
              <Text style={[styles.toggleBtnText, answer === 'no' && styles.toggleBtnTextActive]}>No</Text>
            </TouchableOpacity>
          </View>
          {answer === 'yes' && (
            <Text style={styles.questionReasoning}>{question.yes_reasoning}</Text>
          )}
        </View>
      )}

      {/* ── Booster interval ── */}
      {showDetails && boosterIntervalDays !== null && (
        <Text style={styles.boosterInterval}>
          Revaccination recommended every {intervalToText(boosterIntervalDays)}
        </Text>
      )}

      {/* ── Discrepancy warning ── */}
      {showDetails && group.hasDiscrepancy && (
        <View style={styles.discrepancyBox}>
          <Text style={styles.discrepancyText}>
            ⚠ Sources disagree on the requirement level. Use your judgement or consult a travel doctor.
          </Text>
          <View style={styles.discrepancyFooter}>
            <TouchableOpacity onPress={onReport}>
              <Text style={styles.reportLink}>Report issue →</Text>
            </TouchableOpacity>
            {showUndo && (
              <TouchableOpacity onPress={onUndo}>
                <Text style={styles.undoText}>↩ Undo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Age ineligibility notice ── */}
      {isAgeIneligible && (
        <View style={styles.ageNotice}>
          <Text style={styles.ageNoticeText}>
            ⚠ This vaccine is approved for ages {minAge}+. Based on the date of birth in your profile, you may not be eligible. Please consult your healthcare provider.
          </Text>
        </View>
      )}

      {/* ── Action buttons (only when not yet selected and age-eligible) ── */}
      {!isInPassport && !isOnChecklist && !isAgeIneligible && (
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
  cardBoosterDue: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFB300',
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
  boosterDueBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  boosterDueBadgeText: { ...typography.caption, color: '#E65100', fontWeight: '700' },
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
  levelRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  levelLine: { ...typography.bodySmall, color: colors.textSecondary, marginVertical: spacing.xs },
  levelLineFlex: { flex: 1 },
  inlineBadge: { ...typography.caption, fontWeight: '700', borderRadius: 3 },
  undoInline: { paddingBottom: spacing.xs },
  undoText: { ...typography.caption, color: colors.textMuted },
  boosterInterval: {
    ...typography.caption,
    color: '#7B5800',
    fontStyle: 'italic',
  },
  discrepancyBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  discrepancyText: { ...typography.bodySmall, color: '#7B5800' },
  discrepancyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  btn: { marginTop: 0 },
  // Contextual question
  questionBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#C7D7F5',
  },
  questionText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  toggleBtnYes: {
    borderColor: '#BF360C',
    backgroundColor: '#FBE9E7',
  },
  toggleBtnNo: {
    borderColor: colors.border,
    backgroundColor: '#F5F5F5',
  },
  toggleBtnText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  toggleBtnTextActive: { color: colors.textPrimary },
  questionReasoning: {
    ...typography.bodySmall,
    color: '#BF360C',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Age ineligibility
  ageNotice: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  ageNoticeText: { ...typography.bodySmall, color: '#7B5800' },
})
