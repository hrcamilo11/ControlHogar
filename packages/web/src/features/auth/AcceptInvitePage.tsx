import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import toast from 'react-hot-toast'

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'success'>('loading')
  const [invitation, setInvitation] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) return
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*, homes(name)')
      .eq('token', token!)
      .single()

    if (error || !data) {
      setStatus('error')
      setErrorMessage('Invitación no encontrada')
      return
    }

    if (data.accepted_at) {
      setStatus('error')
      setErrorMessage('Esta invitación ya fue utilizada')
      return
    }

    if (data.revoked_at) {
      setStatus('error')
      setErrorMessage('Esta invitación fue revocada')
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setStatus('error')
      setErrorMessage('Esta invitación ha expirado')
      return
    }

    setInvitation(data)
    setStatus('ready')
  }

  const handleAccept = async () => {
    if (!session || !invitation) return

    // Check if already a member
    const { data: existing } = await supabase
      .from('home_members')
      .select('id')
      .eq('home_id', invitation.home_id)
      .eq('user_id', session.user.id)
      .single()

    if (existing) {
      toast.success('Ya eres miembro de este hogar')
      navigate('/')
      return
    }

    // Add as member
    const { error: memberError } = await supabase.from('home_members').insert({
      home_id: invitation.home_id,
      user_id: session.user.id,
      role: invitation.role,
    })

    if (memberError) {
      toast.error(memberError.message)
      return
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    setStatus('success')
    toast.success('¡Te has unido al hogar!')
    setTimeout(() => navigate('/'), 1500)
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invitación a un hogar</h1>
          <p className="text-gray-600">Debes iniciar sesión o crear una cuenta para aceptar esta invitación.</p>
          <a href="/auth/login" className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            Iniciar Sesión
          </a>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="text-5xl">❌</div>
          <h1 className="text-2xl font-bold text-gray-900">Invitación inválida</h1>
          <p className="text-gray-600">{errorMessage}</p>
          <a href="/" className="inline-block text-sm font-medium text-primary-600 hover:text-primary-500">
            Ir al inicio
          </a>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">¡Te has unido!</h1>
          <p className="text-gray-600">Redirigiendo al hogar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-5xl">🏠</div>
        <h1 className="text-2xl font-bold text-gray-900">Te han invitado a un hogar</h1>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-left">
          <p className="text-sm text-gray-500">Hogar</p>
          <p className="text-lg font-semibold text-gray-900">{invitation?.homes?.name}</p>
          <p className="mt-2 text-sm text-gray-500">Rol asignado</p>
          <p className="font-medium text-gray-900 capitalize">{invitation?.role}</p>
        </div>
        <button
          onClick={handleAccept}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          data-testid="accept-invite-button"
        >
          Aceptar Invitación
        </button>
        <a href="/" className="block text-sm text-gray-500 hover:text-gray-700">
          No, gracias
        </a>
      </div>
    </div>
  )
}
