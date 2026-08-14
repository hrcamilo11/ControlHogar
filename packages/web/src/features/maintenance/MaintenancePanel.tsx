import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { Pencil, Trash2, MessageCircle, Camera, Play, Check } from 'lucide-react'

interface Maintenance {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  created_by: string
  assigned_to: string | null
  estimated_date: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  profiles?: { display_name: string } | null
  assignee?: { display_name: string } | null
  completer?: { display_name: string } | null
}

interface Member {
  user_id: string
  profiles: { display_name: string } | null
}

export function MaintenancePanel({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Maintenance | null>(null)
  const [filter, setFilter] = useState<string>('active')
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('user_id, profiles(display_name)').eq('home_id', homeId)
      return (data ?? []).map((m: any) => ({ user_id: m.user_id, profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles })) as Member[]
    },
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ['maintenance', homeId, filter],
    queryFn: async () => {
      let query = supabase
        .from('maintenances')
        .select('*, profiles:created_by(display_name), assignee:assigned_to(display_name), completer:completed_by(display_name), tasks(title)')
        .eq('home_id', homeId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })

      if (filter === 'active') query = query.in('status', ['pending', 'in_progress'])
      else if (filter !== 'all') query = query.eq('status', filter)

      const { data, error } = await query
      if (error) throw error
      return data as Maintenance[]
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = session?.user.id
      }
      const { error } = await supabase.from('maintenances').update(updateData).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', homeId] })
      toast.success('Estado actualizado')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maintenances').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', homeId] })
      toast.success('Mantenimiento eliminado')
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando mantenimientos...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Mantenimientos ({items?.length ?? 0})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditingItem(null) }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" data-testid="maintenance-add-button">+ Nuevo</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'active', label: 'Activos' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'in_progress', label: 'En progreso' },
          { key: 'completed', label: 'Completados' },
          { key: 'all', label: 'Todos' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.label}</button>
        ))}
      </div>

      {(showForm || editingItem) && (
        <MaintenanceForm
          homeId={homeId}
          members={members ?? []}
          editingItem={editingItem}
          onSaved={() => { setShowForm(false); setEditingItem(null); queryClient.invalidateQueries({ queryKey: ['maintenance', homeId] }) }}
          onCancel={() => { setShowForm(false); setEditingItem(null) }}
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
            homeId={homeId}
            onStatusChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
            onEdit={() => { setEditingItem(item); setShowForm(false) }}
            onDelete={() => { if (confirm('¿Eliminar este mantenimiento?\n\nLas notas y fotos también se eliminarán.')) deleteMutation.mutate(item.id) }}
          />
        ))}
      </div>
    </div>
  )
}

function MaintenanceCard({ item, homeId, onStatusChange, onEdit, onDelete }: {
  item: Maintenance; homeId: string; onStatusChange: (status: string) => void; onEdit: () => void; onDelete: () => void
}) {
  const [showNotes, setShowNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const queryClient = useQueryClient()
  const { session } = useAuth()

  const priorityColors = { high: 'border-l-red-500 bg-red-50', medium: 'border-l-yellow-500 bg-yellow-50', low: 'border-l-green-500 bg-green-50' }
  const priorityLabels = { high: 'Alta', medium: 'Media', low: 'Baja' }
  const statusLabels = { pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completado' }
  const nextStatus: Record<string, string> = { pending: 'in_progress', in_progress: 'completed' }
  const nextStatusLabel: Record<string, string> = { pending: 'Iniciar', in_progress: 'Completar' }

  const canModify = item.created_by === session?.user.id

  const { data: notes } = useQuery({
    queryKey: ['maintenance-notes', item.id],
    enabled: showNotes,
    queryFn: async () => {
      const { data, error } = await supabase.from('maintenance_notes').select('*, profiles:user_id(display_name)').eq('maintenance_id', item.id).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: photos } = useQuery({
    queryKey: ['maintenance-photos', item.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('maintenance_photos').select('*').eq('maintenance_id', item.id).order('created_at', { ascending: false })
      if (error) throw error
      return data as { id: string; url: string; caption: string | null }[]
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('maintenance_notes').insert({ maintenance_id: item.id, user_id: session!.user.id, content: newNote })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance-notes', item.id] }); setNewNote(''); toast.success('Nota agregada') },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleAddPhoto = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const filePath = `${item.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('maintenance-photos').upload(filePath, file)
      if (error) { toast.error('Error subiendo foto'); return }
      const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(filePath)
      await supabase.from('maintenance_photos').insert({ maintenance_id: item.id, user_id: session!.user.id, url: urlData.publicUrl })
      toast.success('Foto agregada')
      queryClient.invalidateQueries({ queryKey: ['maintenance-photos', item.id] })
    }
    input.click()
  }

  return (
    <div className={`rounded-lg border border-l-4 bg-white p-4 ${priorityColors[item.priority]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            {item.status === 'completed' && <span className="text-green-500">✓</span>}
          </div>
          {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              {priorityLabels[item.priority]}
            </span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5">{statusLabels[item.status]}</span>
            <span>Creado: {new Date(item.created_at).toLocaleDateString('es-CO')}</span>
            {item.profiles?.display_name && <span>Por: {item.profiles.display_name}</span>}
            {item.assignee?.display_name && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">👤 {item.assignee.display_name}</span>}
            {item.estimated_date && <span>📅 Est: {new Date(item.estimated_date).toLocaleDateString('es-CO')}</span>}
            {(item as any).task_id && (item as any).tasks?.title && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">📋 {(item as any).tasks.title}</span>}
            {item.completed_at && <span className="text-green-600">✓ {new Date(item.completed_at).toLocaleDateString('es-CO')} por {item.completer?.display_name ?? '?'}</span>}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> Notas
            </button>
            <button onClick={handleAddPhoto} className="flex items-center gap-1 rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors">
              <Camera className="h-3.5 w-3.5" /> Foto
            </button>
            {canModify && (
              <>
                <button onClick={onEdit} className="flex items-center gap-1 rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button onClick={onDelete} className="flex items-center gap-1 rounded-lg px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {nextStatus[item.status] && (
          <button onClick={() => onStatusChange(nextStatus[item.status]!)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'pending' ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
            {item.status === 'pending' ? <Play className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {nextStatusLabel[item.status]}
          </button>
        )}
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Agregar nota..." className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" onKeyDown={(e) => { if (e.key === 'Enter' && newNote.trim()) addNoteMutation.mutate() }} />
            <button onClick={() => { if (newNote.trim()) addNoteMutation.mutate() }} disabled={!newNote.trim()} className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50">+</button>
          </div>
          {notes?.map((note: any) => (
            <div key={note.id} className="rounded bg-gray-50 px-2 py-1 text-xs">
              <span className="font-medium text-gray-700">{note.profiles?.display_name}:</span> <span className="text-gray-600">{note.content}</span>
              <span className="ml-2 text-gray-400">{new Date(note.created_at).toLocaleDateString('es-CO')}</span>
            </div>
          ))}
          {notes?.length === 0 && <p className="text-xs text-gray-400">Sin notas aún</p>}
        </div>
      )}

      {/* Photos */}
      {photos && photos.length > 0 && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">📷 Fotos ({photos.length})</p>
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo) => <PhotoThumbnail key={photo.id} photo={photo} />)}
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
      <button onClick={() => setShowModal(true)} className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 hover:border-primary-400 transition-colors">
        <img src={photo.url} alt={photo.caption ?? 'Foto'} className="h-full w-full object-cover" />
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg">✕</button>
            <img src={photo.url} alt={photo.caption ?? 'Foto'} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </>
  )
}

function MaintenanceForm({ homeId, members, editingItem, onSaved, onCancel }: {
  homeId: string; members: Member[]; editingItem: Maintenance | null; onSaved: () => void; onCancel: () => void
}) {
  const { session } = useAuth()
  const [title, setTitle] = useState(editingItem?.title ?? '')
  const [description, setDescription] = useState(editingItem?.description ?? '')
  const [priority, setPriority] = useState(editingItem?.priority ?? 'medium')
  const [assignedTo, setAssignedTo] = useState(editingItem?.assigned_to ?? '')
  const [estimatedDate, setEstimatedDate] = useState(editingItem?.estimated_date?.split('T')[0] ?? '')
  const [taskId, setTaskId] = useState((editingItem as any)?.task_id ?? '')
  const [isLoading, setIsLoading] = useState(false)

  const { data: homeTasks } = useQuery({
    queryKey: ['tasks-for-maintenance', homeId],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('id, title').eq('home_id', homeId).eq('is_active', true).order('title')
      return data as { id: string; title: string }[] ?? []
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('El título no puede estar vacío'); return }
    if (!session) return
    setIsLoading(true)

    const data: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assigned_to: assignedTo || null,
      estimated_date: estimatedDate ? new Date(estimatedDate).toISOString() : null,
      task_id: taskId || null,
    }

    if (editingItem) {
      const { error } = await supabase.from('maintenances').update(data).eq('id', editingItem.id)
      if (error) { toast.error(error.message); setIsLoading(false); return }
      toast.success('Mantenimiento actualizado')
    } else {
      data.home_id = homeId
      data.created_by = session.user.id
      const { error } = await supabase.from('maintenances').insert(data)
      if (error) { toast.error(error.message); setIsLoading(false); return }
      toast.success('Mantenimiento registrado')
    }

    onSaved()
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-primary-700 uppercase">{editingItem ? 'Editando mantenimiento' : 'Nuevo mantenimiento'}</p>

      <input type="text" required placeholder="¿Qué necesita arreglo?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />

      <textarea placeholder="Descripción o detalles (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />

      <div className="grid grid-cols-2 gap-2">
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="high">🔴 Alta</option>
          <option value="medium">🟡 Media</option>
          <option value="low">🟢 Baja</option>
        </select>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Sin asignar</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name}</option>)}
        </select>
      </div>

      {/* Associate with task */}
      <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="">📋 Sin tarea asociada</option>
        {homeTasks?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>

      <div>
        <label className="text-xs text-gray-600">Fecha estimada de resolución (opcional):</label>
        <input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Registrar'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancelar</button>
      </div>
    </form>
  )
}
