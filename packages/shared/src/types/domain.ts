import type { Role, Platform, NotificationCategory } from './enums'

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  emailVerified: boolean
  mfaEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Home {
  id: string
  name: string
  description: string | null
  createdBy: string
  isActive: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface HomeMember {
  id: string
  homeId: string
  userId: string
  role: Role
  joinedAt: string
  user?: User
}

export interface Invitation {
  id: string
  homeId: string
  invitedBy: string
  email: string | null
  role: Role
  token: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface UserDevice {
  id: string
  userId: string
  pushToken: string
  platform: Platform
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  userId: string
  homeId: string | null
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

export interface ActivityEntry {
  id: string
  homeId: string
  userId: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user?: User
}

export interface NotificationPreference {
  id: string
  userId: string
  category: NotificationCategory
  pushEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean
}
