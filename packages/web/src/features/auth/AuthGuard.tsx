import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { ReactNode } from 'react'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session } = useAuth()

  if (!session) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
