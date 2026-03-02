import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} size="small" />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  label: { ...typography.body, fontWeight: '600' },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: '#fff' },
  outlineLabel: { color: colors.primary },
  ghostLabel: { color: colors.primary },
})
