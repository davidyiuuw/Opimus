import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      return data?.role === 'admin'
    },
    staleTime: 1000 * 60 * 5,
  })
  return { isAdmin: data ?? false, isLoading }
}
