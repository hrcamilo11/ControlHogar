export const Role = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus]

export const Platform = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const

export type Platform = (typeof Platform)[keyof typeof Platform]

export const NotificationCategory = {
  TASKS: 'tasks',
  FINANCE: 'finance',
  MAINTENANCE: 'maintenance',
  HOME: 'home',
} as const

export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory]

export const ConnectionStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
} as const

export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus]
