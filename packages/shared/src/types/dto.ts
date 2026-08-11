import type { Role, NotificationCategory } from './enums'

// Auth DTOs
export interface SignUpInput {
  email: string
  password: string
  displayName: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface AuthResult {
  user: { id: string; email: string }
  session: { accessToken: string; refreshToken: string; expiresAt: number }
}

// Home DTOs
export interface CreateHomeInput {
  name: string
  description?: string
}

export interface UpdateHomeInput {
  name?: string
  description?: string
}

// Member DTOs
export interface CreateInvitationInput {
  email?: string
  role: Exclude<Role, 'owner'>
}

// Notification DTOs
export interface UpdatePreferencesInput {
  category: NotificationCategory
  pushEnabled?: boolean
  emailEnabled?: boolean
  inAppEnabled?: boolean
}

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

// Filters
export interface NotificationFilters {
  isRead?: boolean
  homeId?: string
  limit?: number
  cursor?: string
}

export interface ActivityFilters {
  homeId: string
  limit?: number
  cursor?: string
}
