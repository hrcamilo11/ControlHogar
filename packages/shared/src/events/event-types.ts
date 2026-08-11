import type { Home, HomeMember, AppNotification } from '../types'

export type EventMap = {
  // Home events
  'home.created': { home: Home }
  'home.deleted': { homeId: string }
  'home.restored': { home: Home }

  // Member events
  'member.joined': { member: HomeMember; homeId: string }
  'member.removed': { userId: string; homeId: string }
  'member.roleChanged': { member: HomeMember; previousRole: string }

  // Invitation events
  'invitation.created': { homeId: string; email: string | null; role: string }
  'invitation.accepted': { homeId: string; userId: string }

  // Notification events
  'notification.received': { notification: AppNotification }
  'notification.read': { notificationId: string }
  'notification.allRead': { userId: string }

  // Sync events
  'sync.connected': Record<string, never>
  'sync.disconnected': Record<string, never>
  'sync.conflictDetected': { conflictId: string; table: string }
  'sync.conflictResolved': { conflictId: string }
  'sync.pendingChanges': { count: number }

  // Activity events
  'activity.new': { homeId: string; count: number }
}

export type AppEvent = {
  [K in keyof EventMap]: { type: K; payload: EventMap[K] }
}[keyof EventMap]
