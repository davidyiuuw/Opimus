import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  isLoading: boolean
  needsOnboarding: boolean | null
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setNeedsOnboarding: (value: boolean | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  needsOnboarding: null,
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),
}))
