import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Home {
  id: string
  name: string
  description: string | null
  created_by: string
  is_active: boolean
  created_at: string
}

export function useHomes() {
  return useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Home[]
    },
  })
}

export function useHomeMembers(homeId: string | null) {
  return useQuery({
    queryKey: ['home-members', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_members')
        .select('*, profiles(display_name, email, avatar_url)')
        .eq('home_id', homeId!)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return data
    },
  })
}
