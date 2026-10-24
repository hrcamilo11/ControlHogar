import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Home, Users, ArrowLeft } from 'lucide-react'

type Mode = 'choose' | 'create' | 'join'

export function CreateHomePage({ onCreated }: { onCreated: () => void }) {
  const [mode, setMode] = useState<Mode>('choose')

  if (mode === 'create') return <CreateHomeForm onCreated={onCreated} onBack={() => setMode('choose')} />
  if (mode === 'join') return <JoinHomeForm onJoined={onCreated} onBack={() => setMode('choose')} />

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center"><Home className="h-12 w-12 text-primary-500" /></div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Bienvenido a ControlHogar</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            ¿Qué quieres hacer?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMode('create')}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-primary-400 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:hover:border-primary-500"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <Home className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Crear un hogar nuevo</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Empieza de cero y luego invita a tu grupo</p>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-primary-400 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:hover:border-primary-500"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Tengo un código de invitación</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alguien me compartió un código de 6 caracteres</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateHomeForm({ onCreated, onBack }: { onCreated: () => void; onBack: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    const { error } = await supabase.from('homes').insert({
      name,
      description: description || null,
      created_by: session.session.user.id,
    })

    if (error) toast.error(error.message)
    else { toast.success('¡Hogar creado!'); onCreated() }
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Crear hogar</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Tu espacio para gestionar tareas, gastos y más.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del hogar</label>
            <input type="text" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Apartamento Centro" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción (opcional)</label>
            <textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Una breve descripción..." rows={2} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {isLoading ? 'Creando...' : 'Crear Hogar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function JoinHomeForm({ onJoined, onBack }: { onJoined: () => void; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) { toast.error('El código debe tener 6 caracteres'); return }
    setIsLoading(true)

    const { data, error } = await supabase.rpc('join_home_by_code', { p_code: code.trim().toUpperCase() })

    if (error) {
      toast.error(error.message)
    } else if (data && typeof data === 'object') {
      const result = data as { success: boolean; error?: string; home_name?: string; already_member?: boolean }
      if (result.success) {
        if (result.already_member) {
          toast.success(`Ya eres miembro de "${result.home_name}"`)
        } else {
          toast.success(`¡Te uniste a "${result.home_name}"!`)
        }
        onJoined()
      } else {
        toast.error(result.error ?? 'Código inválido')
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Unirse a un hogar</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Ingresa el código de 6 caracteres que te compartieron.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código de invitación</label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ''))}
              placeholder="ABC123"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={isLoading || code.length < 6} className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {isLoading ? 'Verificando...' : 'Unirme al hogar'}
          </button>
        </form>
      </div>
    </div>
  )
}
