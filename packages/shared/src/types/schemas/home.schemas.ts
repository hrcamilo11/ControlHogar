import { z } from 'zod'
import { Role } from '../enums'

export const createHomeSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener mínimo 2 caracteres')
    .max(100, 'El nombre debe tener máximo 100 caracteres'),
  description: z.string().max(500, 'La descripción debe tener máximo 500 caracteres').optional(),
})

export const updateHomeSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener mínimo 2 caracteres')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'La descripción debe tener máximo 500 caracteres')
    .nullable()
    .optional(),
})

export const createInvitationSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  role: z.enum([Role.ADMIN, Role.MEMBER, Role.GUEST], {
    errorMap: () => ({ message: 'Rol debe ser admin, member o guest' }),
  }),
})

export const changeRoleSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  role: z.enum([Role.ADMIN, Role.MEMBER, Role.GUEST], {
    errorMap: () => ({ message: 'Rol debe ser admin, member o guest' }),
  }),
})

export type CreateHomeSchema = z.infer<typeof createHomeSchema>
export type UpdateHomeSchema = z.infer<typeof updateHomeSchema>
export type CreateInvitationSchema = z.infer<typeof createInvitationSchema>
export type ChangeRoleSchema = z.infer<typeof changeRoleSchema>
