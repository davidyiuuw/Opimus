import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { colors } from '../../../theme/colors'
import { typography } from '../../../theme/typography'
import { borderRadius, spacing } from '../../../theme/spacing'

const LEVELS = ['required', 'recommended', 'routine', 'not_recommended'] as const

interface Proposal {
  id: string
  country_id: number
  vaccine_id: number
  source: string
  is_new_entry: boolean
  current_level: string | null
  current_notes: string | null
  current_source_url: string | null
  proposed_level: string
  proposed_notes: string | null
  proposed_source_url: string | null
  countries: { name: string }
  vaccines: { name: string }
}

async function fetchProposal(id: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('scraper_proposals')
    .select('*, countries(name), vaccines(name)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Proposal
}

async function approveProposal(params: {
  proposal: Proposal
  finalLevel: string
  finalNotes: string | null
  finalSourceUrl: string | null
}): Promise<void> {
  const { proposal, finalLevel, finalNotes, finalSourceUrl } = params
  const { data: { user } } = await supabase.auth.getUser()

  // Apply to vaccine_recommendations
  const { error: upsertError } = await supabase
    .from('vaccine_recommendations')
    .upsert({
      country_id: proposal.country_id,
      vaccine_id: proposal.vaccine_id,
      source: proposal.source,
      level: finalLevel,
      notes: finalNotes,
      source_url: finalSourceUrl,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'country_id,vaccine_id,source', ignoreDuplicates: false })
  if (upsertError) throw new Error(upsertError.message)

  // Mark proposal as approved
  const { error: updateError } = await supabase
    .from('scraper_proposals')
    .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq('id', proposal.id)
  if (updateError) throw new Error(updateError.message)
}

async function rejectProposal(params: { id: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('scraper_proposals')
    .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq('id', params.id)
  if (error) throw new Error(error.message)
}

function DiffRow({ label, current, proposed, edited, onEdit, editMode }: {
  label: string
  current: string | null
  proposed: string | null
  edited: string
  onEdit: (v: string) => void
  editMode: boolean
}) {
  const unchanged = current === proposed
  return (
    <View style={styles.diffSection}>
      <Text style={styles.diffLabel}>{label}</Text>
      {!editMode ? (
        <>
          {current != null && (
            <View style={styles.diffOld}>
              <Text style={styles.diffOldLabel}>Current</Text>
              <Text style={styles.diffOldText}>{current || '—'}</Text>
            </View>
          )}
          <View style={[styles.diffNew, unchanged && styles.diffNewUnchanged]}>
            <Text style={styles.diffNewLabel}>{unchanged ? 'Unchanged' : 'Proposed'}</Text>
            <Text style={[styles.diffNewText, unchanged && styles.diffNewTextUnchanged]}>
              {proposed || '—'}
            </Text>
          </View>
        </>
      ) : (
        <TextInput
          style={styles.editInput}
          value={edited}
          onChangeText={onEdit}
          multiline
          placeholderTextColor={colors.textMuted}
        />
      )}
    </View>
  )
}

export default function ProposalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => fetchProposal(id),
  })

  const [editedLevel, setEditedLevel] = useState('')
  const [editedNotes, setEditedNotes] = useState('')
  const [editedSourceUrl, setEditedSourceUrl] = useState('')

  function enterEditMode() {
    setEditedLevel(proposal?.proposed_level ?? '')
    setEditedNotes(proposal?.proposed_notes ?? '')
    setEditedSourceUrl(proposal?.proposed_source_url ?? '')
    setEditMode(true)
  }

  const approveMutation = useMutation({
    mutationFn: approveProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProposals'] })
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      Alert.alert('Approved', 'The change is now live.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProposals'] })
      router.back()
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  function handleApprove() {
    if (!proposal) return
    approveMutation.mutate({
      proposal,
      finalLevel: editMode ? editedLevel : proposal.proposed_level,
      finalNotes: editMode ? (editedNotes || null) : proposal.proposed_notes,
      finalSourceUrl: editMode ? (editedSourceUrl || null) : proposal.proposed_source_url,
    })
  }

  function handleReject() {
    Alert.alert('Reject this change?', 'The current live data will remain unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ id }) },
    ])
  }

  if (isLoading || !proposal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  const isBusy = approveMutation.isPending || rejectMutation.isPending

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Meta ── */}
        <View style={styles.meta}>
          <View style={[styles.badge, proposal.is_new_entry ? styles.badgeNew : styles.badgeUpdated]}>
            <Text style={[styles.badgeText, proposal.is_new_entry ? styles.badgeTextNew : styles.badgeTextUpdated]}>
              {proposal.is_new_entry ? 'New Entry' : 'Update'}
            </Text>
          </View>
          <Text style={styles.metaSource}>{proposal.source.toUpperCase()}</Text>
        </View>
        <Text style={styles.vaccineName}>{(proposal.vaccines as any)?.name}</Text>
        <Text style={styles.countryName}>{(proposal.countries as any)?.name}</Text>

        <View style={styles.divider} />

        {/* ── Level ── */}
        <View style={styles.diffSection}>
          <Text style={styles.diffLabel}>Recommendation Level</Text>
          {!editMode ? (
            <>
              {proposal.current_level && (
                <View style={styles.diffOld}>
                  <Text style={styles.diffOldLabel}>Current</Text>
                  <Text style={styles.diffOldText}>{proposal.current_level}</Text>
                </View>
              )}
              <View style={[styles.diffNew, proposal.current_level === proposal.proposed_level && styles.diffNewUnchanged]}>
                <Text style={styles.diffNewLabel}>
                  {proposal.current_level === proposal.proposed_level ? 'Unchanged' : 'Proposed'}
                </Text>
                <Text style={[styles.diffNewText, proposal.current_level === proposal.proposed_level && styles.diffNewTextUnchanged]}>
                  {proposal.proposed_level}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.levelChips}>
              {LEVELS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.levelChip, editedLevel === l && styles.levelChipActive]}
                  onPress={() => setEditedLevel(l)}
                >
                  <Text style={[styles.levelChipText, editedLevel === l && styles.levelChipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Notes ── */}
        <DiffRow
          label="Notes"
          current={proposal.current_notes}
          proposed={proposal.proposed_notes}
          edited={editedNotes}
          onEdit={setEditedNotes}
          editMode={editMode}
        />

        {/* ── Source URL ── */}
        <DiffRow
          label="Source URL"
          current={proposal.current_source_url}
          proposed={proposal.proposed_source_url}
          edited={editedSourceUrl}
          onEdit={setEditedSourceUrl}
          editMode={editMode}
        />

      </ScrollView>

      {/* ── Action bar ── */}
      <View style={styles.actionBar}>
        {!editMode ? (
          <>
            <TouchableOpacity style={styles.editBtn} onPress={enterEditMode} disabled={isBusy}>
              <Text style={styles.editBtnText}>✏ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={isBusy}>
              <Text style={styles.approveBtnText}>{approveMutation.isPending ? 'Approving…' : '✓ Approve'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={isBusy}>
              <Text style={styles.rejectBtnText}>✕ Reject</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(false)} disabled={isBusy}>
              <Text style={styles.editBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveBtn, { flex: 2 }]} onPress={handleApprove} disabled={isBusy}>
              <Text style={styles.approveBtnText}>{approveMutation.isPending ? 'Approving…' : '✓ Approve with Edits'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeNew: { backgroundColor: '#E8F5E9' },
  badgeUpdated: { backgroundColor: '#FFF3E0' },
  badgeText: { ...typography.caption, fontWeight: '700' },
  badgeTextNew: { color: '#2E7D32' },
  badgeTextUpdated: { color: '#E65100' },
  metaSource: { ...typography.caption, color: colors.textMuted },
  vaccineName: { ...typography.h2, color: colors.textPrimary },
  countryName: { ...typography.body, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  diffSection: { gap: spacing.xs },
  diffLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', fontSize: 11 },
  diffOld: {
    backgroundColor: '#FFF5F5',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: spacing.sm,
    gap: 2,
  },
  diffOldLabel: { ...typography.caption, color: colors.error, fontWeight: '700' },
  diffOldText: { ...typography.bodySmall, color: colors.textPrimary, textDecorationLine: 'line-through', opacity: 0.7 },
  diffNew: {
    backgroundColor: '#F1F8E9',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#C5E1A5',
    padding: spacing.sm,
    gap: 2,
  },
  diffNewUnchanged: { backgroundColor: colors.surface, borderColor: colors.border },
  diffNewLabel: { ...typography.caption, color: '#558B2F', fontWeight: '700' },
  diffNewText: { ...typography.bodySmall, color: colors.textPrimary },
  diffNewTextUnchanged: { color: colors.textSecondary },
  editInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  levelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  levelChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  levelChipActive: { borderColor: colors.primary, backgroundColor: '#EEF4FB' },
  levelChipText: { ...typography.bodySmall, color: colors.textSecondary },
  levelChipTextActive: { color: colors.primary, fontWeight: '700' },
  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  editBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  approveBtn: {
    flex: 2,
    height: 48,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: { ...typography.body, color: '#fff', fontWeight: '700' },
  rejectBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { ...typography.body, color: colors.error, fontWeight: '600' },
})
