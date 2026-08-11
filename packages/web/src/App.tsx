import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { AcceptInvitePage } from './features/auth/AcceptInvitePage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AuthGuard } from './features/auth/AuthGuard'

export function App() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route
        path="/auth/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/auth/register"
        element={session ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />
    </Routes>
  )
}
