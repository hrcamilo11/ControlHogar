import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

/**
 * Subscribe to Supabase Realtime changes for the active home.
 * Automatically invalidates relevant queries when data changes.
 */
export function useRealtimeSync(homeId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!homeId) return

    const channel = supabase
      .channel(`home:${homeId}`)
      // Tasks changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_completions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
          queryClient.invalidateQueries({ queryKey: ['task-history', homeId] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', homeId] })
        },
      )
      // Expenses changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
          queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
          queryClient.invalidateQueries({ queryKey: ['expenses-month', homeId] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
        },
      )
      // Settlements
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
        },
      )
      // Recurring payments
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurring_payments', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recurring-payments', homeId] })
        },
      )
      // Shopping list
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shopping', homeId] })
        },
      )
      // Maintenance
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenances', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['maintenance', homeId] })
        },
      )
      // Members
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'home_members', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['home-members', homeId] })
        },
      )
      // Activity entries
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_entries', filter: `home_id=eq.${homeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity', homeId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [homeId, queryClient])
}
