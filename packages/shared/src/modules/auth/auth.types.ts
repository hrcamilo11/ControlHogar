export interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: string
    email: string
    emailVerified: boolean
  }
}

export type OAuthProvider = 'google' | 'apple'

export interface MFASetupResult {
  qrCode: string
  secret: string
  uri: string
}

export type Unsubscribe = () => void
