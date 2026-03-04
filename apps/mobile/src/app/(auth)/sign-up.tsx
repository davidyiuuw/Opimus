import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard, Platform, StyleSheet, Alert } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'

export default function SignUpScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({})

  function validate() {
    const next: typeof errors = {}
    if (!email.includes('@')) next.email = 'Enter a valid email address'
    if (password.length < 8) next.password = 'Password must be at least 8 characters'
    if (password !== confirm) next.confirm = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSignUp() {
    if (!validate()) return
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      Alert.alert('Sign Up Failed', error.message)
    } else if (!data.session) {
      // Email confirmation is enabled — session won't exist until they confirm
      setConfirmed(true)
    }
    // If data.session exists, onAuthStateChange in _layout.tsx handles redirect automatically
  }

  if (confirmed) {
    return (
      <View style={styles.confirmContainer}>
        <Text style={styles.confirmIcon}>📧</Text>
        <Text style={styles.confirmTitle}>Check your email</Text>
        <Text style={styles.confirmBody}>
          We sent a confirmation link to {email}.{'\n'}
          Click it to activate your account, then come back and sign in.
        </Text>
        <Link href="/(auth)/sign-in" style={styles.confirmLink}>
          <Text style={styles.confirmLinkText}>Go to Sign In</Text>
        </Link>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start building your vaccine passport</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              error={errors.password}
              placeholder="Min. 8 characters"
            />
            <Input
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              error={errors.confirm}
              placeholder="••••••••"
            />

            <Button label="Create Account" onPress={handleSignUp} loading={loading} />
          </View>

          <TouchableOpacity style={styles.footer}>
            <Link href="/(auth)/sign-in">
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.footerLink}>Sign In</Text>
              </Text>
            </Link>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.xxl },
  title: { ...typography.h1, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: spacing.md },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: '600' },
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  confirmIcon: { fontSize: 56 },
  confirmTitle: { ...typography.h2, color: colors.primary, textAlign: 'center' },
  confirmBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  confirmLink: { marginTop: spacing.sm },
  confirmLinkText: { ...typography.body, color: colors.primary, fontWeight: '600' },
})
