import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Maintenance {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  created_at: string
}

export function MaintenancePanel({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('active')
  const queryClient = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: ['maintenance', homeId, filter],
    queryFn: async () => {
      let query = supabase
        .from('maintenances')
        .select('*')
        .eq('home_id', homeId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })

      if (filter === 'active') {
        query = query.in('status', ['pending', 'in_progress'])
      } else if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Maintenance[]
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status }
      if (status === 'completed') {
        const { data: session } = await supabase.auth.getSession()
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = session.session?.user.id
      }
      const { error } = await supabase.from('maintenances').update(updateData).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', homeId] })
      toast.success('Estado actualizado')
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando mantenimientos...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Mantenimientos ({items?.length ?? 0})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          data-testid="maintenance-add-button"
        >
          + Nuevo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Activos' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'in_progress', label: 'En progreso' },
          { key: 'completed', label: 'Completados' },
          { key: 'all', label: 'Todos' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showForm && (
        <CreateMaintenanceForm
          homeId={homeId}
          onCreated={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['maintenance', homeId] })
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items?.length === 0 && !showForm && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No hay mantenimientos. ¡Todo está en orden!</p>
        </div>
      )}

      <div className="space-y-2">
        {items?.map((item) => (
          <MaintenanceCard
            key={item.id}
            item={item}
            onStatusChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
          />
        ))}
      </div>
    </div>
  )
}

function MaintenanceCard({
  item,
  onStatusChange,
}: {
  item: Maintenance
  onStatusChange: (status: string) => void
}) {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50',
  }

  const priorityLabels = { high: '🔴 Alta', medium: '🟡 Media', low: '🟢 Baja' }
  const statusLabels = { pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completado' }

  const nextStatus: Record<string, string> = {
    pending: 'in_progress',
    in_progress: 'completed',
  }

  const nextStatusLabel: Record<string, string> = {
    pending: 'Iniciar',
    in_progress: 'Completar',
  }

  return (
    <div className={`rounded-lg border border-l-4 bg-white p-4 ${priorityColors[item.priority]}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{item.title}</h3>
          {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span>{priorityLabels[item.priority]}</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5">{statusLabels[item.status]}</span>
            <span>{new Date(item.created_at).toLocaleDateString('es-CO')}</span>
          </div>
        </div>

        {nextStatus[item.status] && (
          <button
            onClick={() => onStatusChange(nextStatus[item.status])}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            data-testid={`maintenance-advance-${item.id}`}
          >
            {nextStatusLabel[item.status]}
          </button>
        )}
      </div>
    </div>
  )
}

function CreateMaintenanceForm({
  homeId,
  onCreated,
  onCancel,
}: {
  homeId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    const { error } = await supabase.from('maintenances').insert({
      home_id: homeId,
      title,
      description: description || null,
      priority,
      created_by: session.session.user.id,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Mantenimiento registrado')
      onCreated()
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <input
        type="text"
        required
        placeholder="¿Qué necesita arreglo?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="maintenance-form-title"
      />
      <textarea
        placeholder="Descripción o detalles (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="maintenance-form-description"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        data-testid="maintenance-form-priority"
      >
        <option value="high">🔴 Prioridad Alta</option>
        <option value="medium">🟡 Prioridad Media</option>
        <option value="low">🟢 Prioridad Baja</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          data-testid="maintenance-form-submit"
        >
          {isLoading ? 'Registrando...' : 'Registrar'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  )
}
