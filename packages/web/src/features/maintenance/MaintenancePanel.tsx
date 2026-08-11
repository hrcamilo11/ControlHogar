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
  const [showNotes, setShowNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const queryClient = useQueryClient()
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

  const { data: notes } = useQuery({
    queryKey: ['maintenance-notes', item.id],
    enabled: showNotes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_notes')
        .select('*, profiles:user_id(display_name)')
        .eq('maintenance_id', item.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: photos } = useQuery({
    queryKey: ['maintenance-photos', item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_photos')
        .select('*')
        .eq('maintenance_id', item.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as { id: string; url: string; caption: string | null; created_at: string }[]
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('No autenticado')
      const { error } = await supabase.from('maintenance_notes').insert({
        maintenance_id: item.id,
        user_id: session.session.user.id,
        content: newNote,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-notes', item.id] })
      setNewNote('')
      toast.success('Nota agregada')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleAddPhoto = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const filePath = `${item.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(filePath, file)

      if (uploadError) {
        toast.error('Error subiendo foto')
        return
      }

      const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(filePath)

      await supabase.from('maintenance_photos').insert({
        maintenance_id: item.id,
        user_id: session.session.user.id,
        url: urlData.publicUrl,
      })

      toast.success('Foto agregada')
      queryClient.invalidateQueries({ queryKey: ['maintenance-photos', item.id] })
    }
    input.click()
  }

  return (
    <div className={`rounded-lg border border-l-4 bg-white p-4 ${priorityColors[item.priority]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{item.title}</h3>
          {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>{priorityLabels[item.priority]}</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5">{statusLabels[item.status]}</span>
            <span>{new Date(item.created_at).toLocaleDateString('es-CO')}</span>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              💬 Notas
            </button>
            <button
              onClick={handleAddPhoto}
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              📷 Foto
            </button>
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

      {/* Notes section */}
      {showNotes && (
        <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Agregar nota..."
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && newNote.trim()) addNoteMutation.mutate() }}
            />
            <button
              onClick={() => { if (newNote.trim()) addNoteMutation.mutate() }}
              disabled={!newNote.trim()}
              className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
          {notes?.map((note: any) => (
            <div key={note.id} className="rounded bg-gray-50 px-2 py-1 text-xs">
              <span className="font-medium text-gray-700">{note.profiles?.display_name}:</span>{' '}
              <span className="text-gray-600">{note.content}</span>
              <span className="ml-2 text-gray-400">{new Date(note.created_at).toLocaleDateString('es-CO')}</span>
            </div>
          ))}
          {notes?.length === 0 && <p className="text-xs text-gray-400">Sin notas aún</p>}
        </div>
      )}

      {/* Photos gallery */}
      {photos && photos.length > 0 && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">📷 Fotos ({photos.length})</p>
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo) => (
              <PhotoThumbnail key={photo.id} photo={photo} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoThumbnail({ photo }: { photo: { id: string; url: string; caption: string | null } }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 hover:border-primary-400 transition-colors"
      >
        <img
          src={photo.url}
          alt={photo.caption ?? 'Foto de mantenimiento'}
          className="h-full w-full object-cover"
        />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>
            <img
              src={photo.url}
              alt={photo.caption ?? 'Foto de mantenimiento'}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            {photo.caption && (
              <p className="mt-2 text-center text-sm text-white">{photo.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
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
