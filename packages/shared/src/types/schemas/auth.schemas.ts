import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  displayName: z
    .string()
    .min(2, 'El nombre debe tener mínimo 2 caracteres')
    .max(50, 'El nombre debe tener máximo 50 caracteres'),
})

export const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const updatePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
})

export const verifyMfaSchema = z.object({
  code: z.string().length(6, 'El código debe ser de 6 dígitos').regex(/^\d+$/, 'Solo dígitos'),
})

export type SignUpSchema = z.infer<typeof signUpSchema>
export type SignInSchema = z.infer<typeof signInSchema>
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>
export type VerifyMfaSchema = z.infer<typeof verifyMfaSchema>
