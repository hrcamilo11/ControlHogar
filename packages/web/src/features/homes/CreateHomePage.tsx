import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function CreateHomePage({ onCreated }: { onCreated: () => void }) {
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

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('¡Hogar creado exitosamente!')
      onCreated()
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-5xl">🏠</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Crea tu Hogar</h1>
          <p className="mt-2 text-gray-600">
            Un hogar es el espacio donde gestionarás tareas, gastos y mantenimientos con tu grupo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="home-name" className="block text-sm font-medium text-gray-700">
              Nombre del hogar
            </label>
            <input
              id="home-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Apartamento Centro, Casa Familia..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              data-testid="create-home-name-input"
            />
          </div>

          <div>
            <label htmlFor="home-description" className="block text-sm font-medium text-gray-700">
              Descripción (opcional)
            </label>
            <textarea
              id="home-description"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una breve descripción de este hogar..."
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              data-testid="create-home-description-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            data-testid="create-home-submit-button"
          >
            {isLoading ? 'Creando...' : 'Crear Hogar'}
          </button>
        </form>
      </div>
    </div>
  )
}
