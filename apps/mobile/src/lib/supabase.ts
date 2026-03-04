import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// Supabase session tokens can exceed SecureStore's 2048-byte limit.
// This adapter splits large values into chunks and reassembles them on read.
const CHUNK_SIZE = 1800

const ChunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}_count`)
    if (!countStr) {
      // No chunks — try reading as a single value (backwards compat)
      return SecureStore.getItemAsync(key)
    }
    const count = parseInt(countStr, 10)
    const chunks: string[] = []
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`)
      if (chunk == null) return null
      chunks.push(chunk)
    }
    return chunks.join('')
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value)
      return
    }
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE))
    }
    await SecureStore.setItemAsync(`${key}_count`, String(chunks.length))
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk))
    )
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}_count`)
    if (countStr) {
      const count = parseInt(countStr, 10)
      await Promise.all([
        SecureStore.deleteItemAsync(`${key}_count`),
        ...Array.from({ length: count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}_chunk_${i}`)
        ),
      ])
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ChunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
