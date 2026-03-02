import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Link } from 'expo-router'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function validate() {
    const next: typeof errors = {}
    if (!email.includes('@')) next.email = 'Enter a valid email address'
    if (password.length < 8) next.password = 'Password must be at least 8 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSignIn() {
    if (!validate()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Sign In Failed', error.message)
    // On success, the onAuthStateChange listener in _layout.tsx handles redirect
  }

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      })
      if (error) Alert.alert('Apple Sign In Failed', error.message)
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', 'Something went wrong. Please try again.')
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Opimus</Text>
        <Text style={styles.subtitle}>Your travel vaccine companion</Text>
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
          autoComplete="password"
          error={errors.password}
          placeholder="••••••••"
        />

        <Button label="Sign In" onPress={handleSignIn} loading={loading} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      </View>

      <TouchableOpacity style={styles.footer}>
        <Link href="/(auth)/sign-up">
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.bodySmall, color: colors.textMuted },
  appleButton: { width: '100%', height: 50 },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: '600' },
})
