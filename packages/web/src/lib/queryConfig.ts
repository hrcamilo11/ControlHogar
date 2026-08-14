/**
 * Shared query configuration for performance optimization.
 * Central place to define staleTime and caching strategies.
 */

// Data that changes frequently (tasks, expenses) — short stale time
export const FREQUENT_DATA_STALE = 15 * 1000 // 15 seconds

// Data that changes less often (members, categories) — longer stale time  
export const STABLE_DATA_STALE = 5 * 60 * 1000 // 5 minutes

// Data that almost never changes (home settings) — very long
export const STATIC_DATA_STALE = 30 * 60 * 1000 // 30 minutes

// Notification polling interval
export const NOTIFICATION_POLL_INTERVAL = 30 * 1000 // 30 seconds

/**
 * Prefetch key data when user logs in to reduce perceived loading.
 */
export async function prefetchHomeData(queryClient: any, homeId: string, supabase: any) {
  // Prefetch members (used everywhere)
  queryClient.prefetchQuery({
    queryKey: ['home-members', homeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('home_members')
        .select('user_id, role, profiles(display_name)')
        .eq('home_id', homeId)
      return data
    },
    staleTime: STABLE_DATA_STALE,
  })

  // Prefetch categories (rarely change)
  queryClient.prefetchQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('expense_categories').select('*').order('name')
      return data
    },
    staleTime: STATIC_DATA_STALE,
  })
}
