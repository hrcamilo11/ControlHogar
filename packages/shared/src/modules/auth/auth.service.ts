import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, OAuthProvider, MFASetupResult, Unsubscribe } from './auth.types'
import type { AuthResult } from '../../types'
import { signUpSchema, signInSchema } from '../../types/schemas'

export class AuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  async signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
    const validated = signUpSchema.parse({ email, password, displayName })

    const { data, error } = await this.supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: { display_name: validated.displayName },
      },
    })

    if (error) throw new AuthError(error.message, error.status ?? 500)
    if (!data.user) throw new AuthError('Registration failed', 500)

    return {
      user: { id: data.user.id, email: data.user.email! },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at ?? 0,
          }
        : { accessToken: '', refreshToken: '', expiresAt: 0 },
    }
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const validated = signInSchema.parse({ email, password })

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    })

    if (error) throw new AuthError('Credenciales inválidas', 401)
    if (!data.session) throw new AuthError('Login failed', 500)

    return {
      user: { id: data.user.id, email: data.user.email! },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      },
    }
  }

  async signInWithOAuth(provider: OAuthProvider): Promise<{ url: string }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${(typeof globalThis !== 'undefined' && 'location' in globalThis) ? (globalThis as unknown as { location: { origin: string } }).location.origin : ''}/auth/callback`,
      },
    })

    if (error) throw new AuthError(error.message, 500)
    return { url: data.url }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw new AuthError(error.message, 500)
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession()
    if (!data.session) return null

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
      user: {
        id: data.session.user.id,
        email: data.session.user.email!,
        emailVerified: data.session.user.email_confirmed_at !== null,
      },
    }
  }

  onAuthStateChange(callback: (session: Session | null) => void): Unsubscribe {
    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        callback(null)
        return
      }
      callback({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ?? 0,
        user: {
          id: session.user.id,
          email: session.user.email!,
          emailVerified: session.user.email_confirmed_at !== null,
        },
      })
    })

    return () => data.subscription.unsubscribe()
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email)
    if (error) throw new AuthError(error.message, 500)
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword })
    if (error) throw new AuthError(error.message, 500)
  }

  async enableMFA(): Promise<MFASetupResult> {
    const { data, error } = await this.supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'ControlHogar TOTP',
    })

    if (error) throw new AuthError(error.message, 500)

    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    }
  }

  async verifyMFA(code: string, factorId: string): Promise<void> {
    const { data: challenge, error: challengeError } =
      await this.supabase.auth.mfa.challenge({ factorId })

    if (challengeError) throw new AuthError(challengeError.message, 500)

    const { error: verifyError } = await this.supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })

    if (verifyError) throw new AuthError('Código MFA inválido', 401)
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
