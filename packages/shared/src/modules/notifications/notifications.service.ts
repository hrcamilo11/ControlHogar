import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppNotification, NotificationPreference } from '../../types'
import type { NotificationFilters, UpdatePreferencesInput } from '../../types/dto'
import { updatePreferencesSchema } from '../../types/schemas'
import { eventBus } from '../../events'

export class NotificationsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getNotifications(filters?: NotificationFilters): Promise<AppNotification[]> {
    let query = this.supabase
      .from('app_notifications')
      .select()
      .order('created_at', { ascending: false })
      .limit(filters?.limit ?? 50)

    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead)
    }
    if (filters?.homeId) {
      query = query.eq('home_id', filters.homeId)
    }
    if (filters?.cursor) {
      query = query.lt('created_at', filters.cursor)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map(mapNotificationFromDb)
  }

  async getUnreadCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (error) throw new Error(error.message)
    return count ?? 0
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw new Error(error.message)
    eventBus.emit('notification.read', { notificationId })
  }

  async markAllAsRead(): Promise<void> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) return

    const { error } = await this.supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('user_id', session.session.user.id)
      .eq('is_read', false)

    if (error) throw new Error(error.message)
    eventBus.emit('notification.allRead', { userId: session.session.user.id })
  }

  async getPreferences(): Promise<NotificationPreference[]> {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select()

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapPreferenceFromDb)
  }

  async updatePreferences(input: UpdatePreferencesInput): Promise<NotificationPreference> {
    const validated = updatePreferencesSchema.parse(input)

    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const updateData: Record<string, unknown> = {}
    if (validated.pushEnabled !== undefined) updateData.push_enabled = validated.pushEnabled
    if (validated.emailEnabled !== undefined) updateData.email_enabled = validated.emailEnabled
    if (validated.inAppEnabled !== undefined) updateData.in_app_enabled = validated.inAppEnabled

    const { data, error } = await this.supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', session.session.user.id)
      .eq('category', validated.category)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapPreferenceFromDb(data)
  }
}

function mapNotificationFromDb(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    homeId: row.home_id as string | null,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    data: row.data as Record<string, unknown> | null,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  }
}

function mapPreferenceFromDb(row: Record<string, unknown>): NotificationPreference {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as NotificationPreference['category'],
    pushEnabled: row.push_enabled as boolean,
    emailEnabled: row.email_enabled as boolean,
    inAppEnabled: row.in_app_enabled as boolean,
  }
}
