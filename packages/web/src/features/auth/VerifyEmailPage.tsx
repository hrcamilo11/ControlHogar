import { Link } from 'react-router-dom'

export function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Verifica tu email</h1>
        <p className="text-gray-600">
          Hemos enviado un enlace de verificación a tu correo electrónico. 
          Por favor revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
        </p>

        <div className="pt-4">
          <Link
            to="/auth/login"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
