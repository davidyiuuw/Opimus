import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { borderRadius, spacing } from '../theme/spacing'

interface OpimusMenuProps {
  /** 'light' — frosted pill, for use on the dark blue home header.
   *  'dark'  — solid primary-blue pill, for use on light nav bars (default). */
  tint?: 'light' | 'dark'
}

// Pill geometry — keep consistent between body and arrow point
const PILL_H = 30
const ARROW_W = 9

export function OpimusMenu({ tint = 'dark' }: OpimusMenuProps) {
  const [visible, setVisible] = useState(false)

  // Arrow-pill fill colour
  const fillColor = tint === 'light'
    ? 'rgba(255,255,255,0.22)'   // frosted white on dark home header
    : colors.primary              // solid brand blue on white nav bars

  async function handleLogout() {
    setVisible(false)
    await AsyncStorage.removeItem('idk_popup_count')
    await supabase.auth.signOut()
  }

  function go(path: string) {
    setVisible(false)
    router.navigate(path as any)
  }

  return (
    <>
      {/* ── Arrow-pill trigger ── */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.trigger}
        activeOpacity={0.75}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      >
        {/* Pill body — flat left end */}
        <View style={[styles.pillBody, { backgroundColor: fillColor }]}>
          <Text style={styles.pillText}>Opimus</Text>
        </View>
        {/* Arrow point — right-facing triangle */}
        <View style={[
          styles.pillPoint,
          {
            borderLeftColor: fillColor,
            borderTopWidth: PILL_H / 2,
            borderBottomWidth: PILL_H / 2,
            borderLeftWidth: ARROW_W,
          },
        ]} />
      </TouchableOpacity>

      {/* ── Dropdown modal ── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setVisible(false)}
          activeOpacity={1}
        >
          <View
            style={[styles.card, { top: Platform.OS === 'ios' ? 96 : 72 }]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity style={styles.item} onPress={() => go('/(tabs)/home')}>
              <Ionicons name="home-outline" size={18} color={colors.textSecondary} style={styles.icon} />
              <Text style={styles.itemLabel}>Home</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.item} onPress={() => go('/(tabs)/profile')}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.icon} />
              <Text style={styles.itemLabel}>Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.item} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} style={styles.icon} />
              <Text style={[styles.itemLabel, styles.itemLogout]}>Log out</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const CARD_WIDTH = 200

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  // Flat-left pill body
  pillBody: {
    height: PILL_H,
    paddingHorizontal: 11,
    justifyContent: 'center',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Right-pointing triangle (border trick)
  pillPoint: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  // Dropdown card
  backdrop: { flex: 1 },
  card: {
    position: 'absolute',
    right: spacing.md,
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  icon: { width: 22 },
  itemLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  itemLogout: { color: colors.error },
  divider: { height: 1, backgroundColor: colors.border },
})
