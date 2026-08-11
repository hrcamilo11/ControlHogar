import { z } from 'zod'
import { NotificationCategory, Platform } from '../enums'

export const updatePreferencesSchema = z.object({
  category: z.enum([
    NotificationCategory.TASKS,
    NotificationCategory.FINANCE,
    NotificationCategory.MAINTENANCE,
    NotificationCategory.HOME,
  ]),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
})

export const registerDeviceSchema = z.object({
  pushToken: z.string().min(1, 'Push token es requerido'),
  platform: z.enum([Platform.IOS, Platform.ANDROID, Platform.WEB]),
})

export type UpdatePreferencesSchema = z.infer<typeof updatePreferencesSchema>
export type RegisterDeviceSchema = z.infer<typeof registerDeviceSchema>
