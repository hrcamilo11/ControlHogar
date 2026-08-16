import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Moon, Sun, Monitor, User, Lock, Home, Tag, Download, LogOut, Crown, DoorOpen, Globe } from 'lucide-react'

type Theme = 'light' | 'dark' | 'amoled' | 'system'
type SettingsSection = 'appearance' | 'profile' | 'home' | 'categories' | 'export'

export function SettingsPanel({ homeId }: { homeId?: string }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance')

  const sections: { key: SettingsSection; label: string; icon: typeof Sun }[] = [
    { key: 'appearance', label: 'Apariencia', icon: Sun },
    { key: 'profile', label: 'Cuenta', icon: User },
    { key: 'home', label: 'Hogar', icon: Home },
    { key: 'categories', label: 'Categorías', icon: Tag },
    { key: 'export', label: 'Datos', icon: Download },
  ]

  return (
    <div className="flex gap-6 max-w-4xl">
      {/* Sidebar */}
      <nav className="w-44 flex-shrink-0 space-y-1">
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === key ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeSection === 'appearance' && <AppearanceSection />}
        {activeSection === 'profile' && <ProfileSection />}
        {activeSection === 'home' && <HomeSection homeId={homeId} />}
        {activeSection === 'categories' && <CategoriesSection homeId={homeId} />}
        {activeSection === 'export' && <ExportSection homeId={homeId} />}
      </div>
    </div>
  )
}

// ─── Appearance ───
function AppearanceSection() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) ?? 'system')

  useEffect(() => { applyTheme(theme); localStorage.setItem('theme', theme) }, [theme])

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold">Apariencia</h3>

      {/* Theme */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600">Tema</label>
        <div className="flex gap-3 flex-wrap">
          {([
            { value: 'light', label: 'Claro', icon: Sun },
            { value: 'dark', label: 'Oscuro', icon: Moon },
            { value: 'amoled', label: 'AMOLED', icon: Moon },
            { value: 'system', label: 'Sistema', icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setTheme(value)} className={`flex flex-col items-center gap-2 rounded-xl border-2 px-5 py-3 transition-all ${theme === value ? 'border-primary-500 bg-primary-50 dark:bg-transparent' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
              <Icon className={`h-5 w-5 ${theme === value ? 'text-primary-600' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${theme === value ? 'text-primary-700' : 'text-gray-600'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Profile/Account ───
function ProfileSection() {
  const { session, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (session?.user.id) {
      supabase.from('profiles').select('display_name, avatar_url').eq('id', session.user.id).single().then(({ data }) => {
        if (data) { setDisplayName(data.display_name); setAvatarUrl(data.avatar_url) }
      })
    }
  }, [session?.user.id])

  const handleSave = async () => {
    if (!displayName.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setIsUpdating(true)
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', session!.user.id)
    if (error) toast.error(error.message)
    else toast.success('Perfil actualizado')
    setIsUpdating(false)
  }

  const handleAvatarUpload = async (file: File) => {
    const filePath = `${session!.user.id}/avatar.${file.name.split('.').pop()}`
    await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session!.user.id)
    setAvatarUrl(data.publicUrl + '?t=' + Date.now())
    toast.success('Avatar actualizado')
  }

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold">Cuenta</h3>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-white text-xs hover:bg-primary-700">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]) }} />
            +
          </label>
        </div>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-gray-500">{session?.user.email}</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs text-gray-600 block mb-1">Nombre</label>
        <div className="flex gap-2">
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={handleSave} disabled={isUpdating} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Guardar</button>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-2 border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4" /> Seguridad</h4>
        <button onClick={async () => { const { error } = await supabase.auth.resetPasswordForEmail(session!.user.email!); if (error) toast.error(error.message); else toast.success('Email enviado') }} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
          Cambiar contraseña
        </button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button onClick={() => { if (confirm('¿Cerrar sesión?')) signOut() }} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </section>
  )
}

// ─── Home Settings ───
function HomeSection({ homeId }: { homeId?: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [homeName, setHomeName] = useState('')
  const [homeDescription, setHomeDescription] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [isUpdating, setIsUpdating] = useState(false)

  const { data: home } = useQuery({
    queryKey: ['home-detail', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase.from('homes').select('*').eq('id', homeId!).single()
      return data
    },
  })

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('user_id, role, profiles(display_name)').eq('home_id', homeId!)
      return data
    },
  })

  useEffect(() => {
    if (home) { setHomeName(home.name); setHomeDescription(home.description ?? ''); setCurrency(home.currency ?? 'COP') }
  }, [home])

  const myRole = members?.find((m: any) => m.user_id === session?.user.id)?.role
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'owner' || myRole === 'admin'

  const handleSave = async () => {
    if (!homeName.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setIsUpdating(true)
    const { error } = await supabase.from('homes').update({ name: homeName.trim(), description: homeDescription.trim() || null, currency }).eq('id', homeId!)
    if (error) toast.error(error.message)
    else { toast.success('Hogar actualizado'); queryClient.invalidateQueries({ queryKey: ['homes'] }) }
    setIsUpdating(false)
  }

  const handleTransferOwnership = async () => {
    const admins = members?.filter((m: any) => m.role === 'admin' && m.user_id !== session?.user.id) ?? []
    const allMembers = members?.filter((m: any) => m.user_id !== session?.user.id && m.role !== 'guest') ?? []
    const candidates = admins.length > 0 ? admins : allMembers

    if (candidates.length === 0) { toast.error('No hay miembros elegibles para transferir'); return }

    const names = candidates.map((m: any, i: number) => `${i + 1}. ${(m as any).profiles?.display_name ?? 'Sin nombre'}`).join('\n')
    const choice = prompt(`¿A quién transferir la propiedad?\n\n${names}\n\nEscribe el número:`)

    if (!choice) return
    const index = parseInt(choice) - 1
    if (isNaN(index) || index < 0 || index >= candidates.length) { toast.error('Opción inválida'); return }

    const target = candidates[index] as any
    if (!confirm(`¿Transferir la propiedad del hogar a ${target.profiles?.display_name}? Tú pasarás a ser admin.`)) return

    await supabase.from('home_members').update({ role: 'admin' }).eq('home_id', homeId!).eq('user_id', session!.user.id)
    await supabase.from('home_members').update({ role: 'owner' }).eq('home_id', homeId!).eq('user_id', target.user_id)
    queryClient.invalidateQueries({ queryKey: ['home-members', homeId] })
    toast.success(`Ownership transferido a ${target.profiles?.display_name}`)
  }

  const handleLeaveHome = async () => {
    if (isOwner) { toast.error('Debes transferir la propiedad antes de abandonar'); return }
    if (!confirm('¿Abandonar este hogar? Perderás acceso a todos los datos.')) return
    await supabase.from('home_members').delete().eq('home_id', homeId!).eq('user_id', session!.user.id)
    queryClient.invalidateQueries({ queryKey: ['homes'] })
    toast.success('Has abandonado el hogar')
    window.location.reload()
  }

  const handleDeleteHome = async () => {
    if (!confirm('¿Eliminar este hogar?\n\nSe conservarán los datos por 30 días antes de eliminarse permanentemente.')) return
    await supabase.from('homes').update({ is_active: false, deleted_at: new Date().toISOString() }).eq('id', homeId!)
    queryClient.invalidateQueries({ queryKey: ['homes'] })
    toast.success('Hogar eliminado (30 días para restaurar)')
    window.location.reload()
  }

  if (!homeId) return <p className="text-sm text-gray-500">Selecciona un hogar primero</p>

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold">Configuración del Hogar</h3>

      {isAdmin && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Nombre del hogar</label>
            <input type="text" value={homeName} onChange={(e) => setHomeName(e.target.value)} maxLength={100} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Descripción</label>
            <input type="text" value={homeDescription} onChange={(e) => setHomeDescription(e.target.value)} maxLength={500} placeholder="Opcional" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Moneda</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="COP">COP - Peso Colombiano</option>
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="CLP">CLP - Peso Chileno</option>
              <option value="PEN">PEN - Sol Peruano</option>
              <option value="BRL">BRL - Real Brasileño</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={isUpdating} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Guardar cambios</button>
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm"><strong>Nombre:</strong> {home?.name}</p>
          <p className="text-sm"><strong>Moneda:</strong> {home?.currency ?? 'COP'}</p>
          <p className="text-xs text-gray-500 mt-2">Solo admins pueden editar la configuración del hogar</p>
        </div>
      )}

      {/* Danger zone */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-red-600">Zona de peligro</h4>

        {isOwner && (
          <button onClick={handleTransferOwnership} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-800 font-medium">
            <Crown className="h-4 w-4" /> Transferir propiedad del hogar
          </button>
        )}

        <button onClick={handleLeaveHome} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium">
          <DoorOpen className="h-4 w-4" /> Abandonar este hogar
        </button>

        {isOwner && (
          <button onClick={handleDeleteHome} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium">
            <Home className="h-4 w-4" /> Eliminar hogar (30 días para restaurar)
          </button>
        )}
      </div>
    </section>
  )
}

// ─── Custom Categories ───
function CategoriesSection({ homeId }: { homeId?: string }) {
  const queryClient = useQueryClient()
  const [newCategory, setNewCategory] = useState('')

  const { data: categories } = useQuery({
    queryKey: ['expense-categories-all', homeId],
    queryFn: async () => {
      const { data } = await supabase.from('expense_categories').select('*').or(`home_id.is.null,home_id.eq.${homeId}`).order('is_default', { ascending: false }).order('name')
      return data as { id: string; name: string; is_default: boolean; home_id: string | null }[]
    },
  })

  const handleAdd = async () => {
    if (!newCategory.trim()) return
    if (!homeId) { toast.error('Selecciona un hogar'); return }
    const { error } = await supabase.from('expense_categories').insert({ name: newCategory.trim(), home_id: homeId, is_default: false })
    if (error) toast.error(error.message)
    else { toast.success('Categoría creada'); setNewCategory(''); queryClient.invalidateQueries({ queryKey: ['expense-categories'] }) }
  }

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) { toast.error('No se pueden eliminar categorías predeterminadas'); return }
    if (!confirm('¿Eliminar esta categoría?')) return
    const { error } = await supabase.from('expense_categories').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Categoría eliminada'); queryClient.invalidateQueries({ queryKey: ['expense-categories'] }) }
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Categorías de Gastos</h3>
      <p className="text-xs text-gray-500">Las categorías predeterminadas no se pueden eliminar. Puedes agregar las tuyas.</p>

      {/* Add */}
      <div className="flex gap-2">
        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nueva categoría..." maxLength={50} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }} />
        <button onClick={handleAdd} disabled={!newCategory.trim()} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Agregar</button>
      </div>

      {/* List */}
      <div className="space-y-1">
        {categories?.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{cat.name}</span>
              {cat.is_default && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Predeterminada</span>}
            </div>
            {!cat.is_default && (
              <button onClick={() => handleDelete(cat.id, cat.is_default)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Export Data ───
function ExportSection({ homeId }: { homeId?: string }) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (type: 'tasks' | 'expenses' | 'maintenance' | 'all') => {
    if (!homeId) { toast.error('Selecciona un hogar'); return }
    setIsExporting(true)

    try {
      const rows: string[][] = []

      if (type === 'tasks' || type === 'all') {
        const { data: tasks } = await supabase.from('tasks').select('title, frequency_type, next_due_date, is_active, created_at').eq('home_id', homeId)
        rows.push(['--- TAREAS ---', '', '', '', ''])
        rows.push(['Título', 'Frecuencia', 'Próxima fecha', 'Activa', 'Creada'])
        for (const t of tasks ?? []) {
          rows.push([t.title, t.frequency_type, t.next_due_date ?? 'Sin fecha', t.is_active ? 'Sí' : 'No', new Date(t.created_at).toLocaleDateString('es-CO')])
        }
        rows.push(['', '', '', '', ''])
      }

      if (type === 'expenses' || type === 'all') {
        const { data: expenses } = await supabase.from('expenses').select('title, amount, split_type, created_at, profiles:paid_by(display_name), expense_categories(name)').eq('home_id', homeId).order('created_at', { ascending: false })
        rows.push(['--- GASTOS ---', '', '', '', ''])
        rows.push(['Título', 'Monto', 'Categoría', 'Pagó', 'Fecha'])
        for (const e of expenses ?? []) {
          rows.push([e.title, String(e.amount), (e.expense_categories as any)?.name ?? 'Sin categoría', (e.profiles as any)?.display_name ?? '?', new Date(e.created_at).toLocaleDateString('es-CO')])
        }
        rows.push(['', '', '', '', ''])
      }

      if (type === 'maintenance' || type === 'all') {
        const { data: maintenances } = await supabase.from('maintenances').select('title, status, priority, created_at').eq('home_id', homeId).order('created_at', { ascending: false })
        rows.push(['--- MANTENIMIENTOS ---', '', '', '', ''])
        rows.push(['Título', 'Estado', 'Prioridad', 'Fecha', ''])
        for (const m of maintenances ?? []) {
          rows.push([m.title, m.status, m.priority, new Date(m.created_at).toLocaleDateString('es-CO'), ''])
        }
      }

      // Generate CSV
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }) // BOM for Excel
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `controlhogar-${type}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Datos exportados como CSV')
    } catch (err) {
      toast.error('Error al exportar')
    }

    setIsExporting(false)
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Exportar Datos</h3>
      <p className="text-xs text-gray-500">Descarga los datos de tu hogar en formato CSV (compatible con Excel).</p>

      <div className="grid grid-cols-2 gap-3">
        {([
          { type: 'tasks', label: 'Tareas' },
          { type: 'expenses', label: 'Gastos' },
          { type: 'maintenance', label: 'Mantenimientos' },
          { type: 'all', label: 'Todo' },
        ] as const).map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleExport(type)}
            disabled={isExporting}
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-left dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4 mb-1 text-gray-400" />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── Theme helper ───
function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'amoled')

  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'amoled') {
    root.classList.add('dark', 'amoled')
  } else if (theme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    }
  }
}
