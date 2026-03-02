import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
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
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      Alert.alert('Sign Up Failed', error.message)
    }
    // On success, onAuthStateChange in _layout.tsx handles redirect
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingVertical: spacing.xxl },
  title: { ...typography.h1, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: spacing.md },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: '600' },
})
