import React, { useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, Alert, Image } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'
import { DocumentType } from '@opimus/types'

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'vaccination_card', label: 'Vaccination Card' },
  { value: 'doctors_note', label: "Doctor's Note" },
  { value: 'pharmacy_record', label: 'Pharmacy Record' },
  { value: 'state_registry', label: 'State Registry Export' },
  { value: 'other', label: 'Other' },
]

export default function UploadScreen() {
  const { vaccineId } = useLocalSearchParams<{ vaccineId: string }>()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [docType, setDocType] = useState<DocumentType>('vaccination_card')
  const [uploading, setUploading] = useState(false)

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  async function handleUpload() {
    if (!imageUri || !vaccineId) return
    setUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const fileName = `${session.user.id}/${vaccineId}/${Date.now()}.jpg`
      const response = await fetch(imageUri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('vaccine-documents')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('vaccine-documents')
        .getPublicUrl(fileName)

      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'
      const res = await fetch(`${apiUrl}/user/vaccines/${vaccineId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ docType, fileUrl: publicUrl, fileName }),
      })

      if (!res.ok) throw new Error('Failed to save document record')

      Alert.alert('Uploaded', 'Your proof of vaccination has been saved.')
      router.back()
    } catch (err) {
      Alert.alert('Upload Failed', (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Document Type</Text>
        <View style={styles.typeList}>
          {DOC_TYPES.map((t) => (
            <Button
              key={t.value}
              label={t.label}
              onPress={() => setDocType(t.value)}
              variant={docType === t.value ? 'primary' : 'outline'}
              style={styles.typeButton}
            />
          ))}
        </View>

        <View style={styles.imageArea}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <Text style={styles.placeholder}>No document selected</Text>
          )}
        </View>

        <Button label="Choose Photo" onPress={pickImage} variant="outline" />
        <Button
          label="Upload"
          onPress={handleUpload}
          loading={uploading}
          disabled={!imageUri}
        />

        <Text style={styles.hint}>
          Accepted: photos of vaccination cards, doctor's notes, pharmacy printouts, or state registry exports.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, flex: 1 },
  label: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
  typeList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeButton: { flex: 1, minWidth: 140, height: 40 },
  imageArea: {
    height: 200,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { ...typography.body, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
})
