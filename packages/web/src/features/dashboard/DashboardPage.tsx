import { useState, lazy, Suspense, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useHomes, useHomeMembers } from '../homes/useHomes'
import { CreateHomePage } from '../homes/CreateHomePage'
import { SummaryCards } from './SummaryCards'
import { StatsPanel } from './StatsPanel'
import { SearchBar } from '@/components/SearchBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ListSkeleton } from '@/components/Skeleton'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Home, ClipboardList, Wallet, Wrench, BarChart3, Bell, Users, LogOut, UserPlus, X, Copy, Settings, Calendar } from 'lucide-react'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Lazy load heavy panels
const TasksPanel = lazy(() => import('../tasks/TasksPanel').then((m) => ({ default: m.TasksPanel })))
const FinancePanel = lazy(() => import('../finance/FinancePanel').then((m) => ({ default: m.FinancePanel })))
const MaintenancePanel = lazy(() => import('../maintenance/MaintenancePanel').then((m) => ({ default: m.MaintenancePanel })))
const ActivityFeed = lazy(() => import('../activity/ActivityFeed').then((m) => ({ default: m.ActivityFeed })))
const SettingsPanel = lazy(() => import('../settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })))
const GlobalCalendar = lazy(() => import('./GlobalCalendar').then((m) => ({ default: m.GlobalCalendar })))

type Tab = 'home' | 'tasks' | 'finance' | 'maintenance' | 'calendar' | 'activity' | 'stats' | 'members' | 'settings'

export function DashboardPage() {
  const { session, signOut } = useAuth()
  const { data: homes, isLoading: homesLoading } = useHomes()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [activeHomeIndex, setActiveHomeIndex] = useState(0)

  const activeHome = homes?.[activeHomeIndex] ?? null
  const { data: members } = useHomeMembers(activeHome?.id ?? null)

  useRealtimeSync(activeHome?.id ?? null)

  if (homesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!activeHome) {
    return <CreateHomePage onCreated={() => queryClient.invalidateQueries({ queryKey: ['homes'] })} />
  }

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'home', label: 'Inicio', icon: <Home className="h-4 w-4" /> },
    { key: 'tasks', label: 'Tareas', icon: <ClipboardList className="h-4 w-4" /> },
    { key: 'finance', label: 'Finanzas', icon: <Wallet className="h-4 w-4" /> },
    { key: 'maintenance', label: 'Mantenim.', icon: <Wrench className="h-4 w-4" /> },
    { key: 'calendar', label: 'Calendario', icon: <Calendar className="h-4 w-4" /> },
    { key: 'stats', label: 'Estadísticas', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'activity', label: 'Actividad', icon: <Bell className="h-4 w-4" /> },
    { key: 'members', label: 'Miembros', icon: <Users className="h-4 w-4" /> },
    { key: 'settings', label: 'Config', icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {homes && homes.length > 1 ? (
              <select
                value={activeHomeIndex}
                onChange={(e) => setActiveHomeIndex(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-900"
                data-testid="home-selector"
              >
                {homes.map((home, idx) => (
                  <option key={home.id} value={idx}>{home.name}</option>
                ))}
              </select>
            ) : (
              <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100"><Home className="h-5 w-5 text-primary-600" /> {activeHome.name}</h1>
            )}
          </div>

          {/* Search bar - hidden on small screens */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <SearchBar homeId={activeHome.id} onNavigate={(tab) => setActiveTab(tab as Tab)} />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden lg:inline">{session?.user.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              data-testid="dashboard-signout-button"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3">
          <SearchBar homeId={activeHome.id} onNavigate={(tab) => setActiveTab(tab as Tab)} />
        </div>
      </header>

      {/* Tabs - scrollable on mobile */}
      <nav className="border-b border-gray-200 bg-white overflow-x-auto dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex space-x-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <span className="mr-1.5 inline-flex">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <ErrorBoundary name={activeTab}>
          <Suspense fallback={<ListSkeleton count={4} />}>
            {activeTab === 'home' && (
              <div className="space-y-6">
                <SummaryCards homeId={activeHome.id} />
                <RecentTasks homeId={activeHome.id} onViewAll={() => setActiveTab('tasks')} />
              </div>
            )}
            {activeTab === 'tasks' && <TasksPanel homeId={activeHome.id} />}
            {activeTab === 'finance' && <FinancePanel homeId={activeHome.id} />}
            {activeTab === 'maintenance' && <MaintenancePanel homeId={activeHome.id} />}
            {activeTab === 'calendar' && <GlobalCalendar homeId={activeHome.id} />}
            {activeTab === 'stats' && <StatsPanel homeId={activeHome.id} />}
            {activeTab === 'activity' && <ActivityFeed homeId={activeHome.id} />}
            {activeTab === 'members' && <MembersPanel members={members} homeId={activeHome.id} />}
            {activeTab === 'settings' && <SettingsPanel homeId={activeHome.id} />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

// Quick view of recent/upcoming tasks on the Home tab
function RecentTasks({ homeId, onViewAll }: { homeId: string; onViewAll: () => void }) {
  const { data: tasks } = useQuery({
    queryKey: ['tasks-upcoming', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, next_due_date, frequency_type')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .order('next_due_date', { ascending: true })
        .limit(5)
      if (error) throw error
      return data
    },
  })

  if (!tasks?.length) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Próximas tareas</h3>
        <button onClick={onViewAll} className="text-xs text-primary-600 font-medium hover:text-primary-800">
          Ver todas →
        </button>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = new Date(task.next_due_date!) < new Date()
          return (
            <div key={task.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
              <span className={`text-sm ${isOverdue ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{task.title}</span>
              <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                {new Date(task.next_due_date!).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MembersPanel({ members, homeId }: { members: unknown[] | undefined; homeId: string }) {
  const [showInvite, setShowInvite] = useState(false)
  const { session } = useAuth()
  const queryClient = useQueryClient()

  if (!members) return <ListSkeleton count={3} />

  const currentUserRole = (members as any[]).find((m: any) => m.user_id === session?.user.id)?.role
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('home_members')
      .update({ role: newRole })
      .eq('home_id', homeId)
      .eq('user_id', userId)

    if (error) toast.error(error.message)
    else {
      queryClient.invalidateQueries({ queryKey: ['home-members', homeId] })
      toast.success('Rol actualizado')
    }
  }

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!confirm(`¿Eliminar a ${displayName} del hogar?`)) return
    const { error } = await supabase.from('home_members').delete().eq('home_id', homeId).eq('user_id', userId)
    if (error) toast.error(error.message)
    else {
      queryClient.invalidateQueries({ queryKey: ['home-members', homeId] })
      toast.success('Miembro eliminado')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Miembros ({members.length})</h2>
        {canManage && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            data-testid="invite-member-button"
          >
            <UserPlus className="h-4 w-4" /> Invitar
          </button>
        )}
      </div>

      {showInvite && (
        <>
          <InviteMemberForm homeId={homeId} onDone={() => setShowInvite(false)} />
          <PendingInvitations homeId={homeId} />
        </>
      )}

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {members.map((member: any) => (
          <div key={member.user_id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                {member.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {member.profiles?.display_name}
                  {member.user_id === session?.user.id && ' (tú)'}
                </p>
                <p className="text-xs text-gray-500">{member.profiles?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && member.role !== 'owner' && member.user_id !== session?.user.id ? (
                <>
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Miembro</option>
                    <option value="guest">Invitado</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(member.user_id, member.profiles?.display_name)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                  {member.role}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InviteMemberForm({ homeId, onDone }: { homeId: string; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('invitations').insert({
      home_id: homeId, invited_by: session.session.user.id,
      email: email || null, role, token, expires_at: expiresAt,
    })

    if (error) toast.error(error.message)
    else {
      setInviteLink(`${window.location.origin}/invite/${token}`)
      toast.success('Invitación creada')
    }
    setIsLoading(false)
  }

  if (inviteLink) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
        <p className="text-sm font-medium text-green-800">¡Invitación creada!</p>
        <div className="flex gap-2">
          <input type="text" readOnly value={inviteLink} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs" />
          <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copiado') }} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white">Copiar</button>
        </div>
        <p className="text-xs text-green-700">Expira en 24 horas</p>
        <button onClick={onDone} className="text-xs text-gray-600 underline">Cerrar</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <input type="email" placeholder="Email (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
      <select value={role} onChange={(e) => setRole(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="member">Miembro</option>
        <option value="guest">Invitado</option>
        <option value="admin">Admin</option>
      </select>
      <div className="flex gap-2">
        <button type="submit" disabled={isLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Creando...' : 'Generar Invitación'}</button>
        <button type="button" onClick={onDone} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancelar</button>
      </div>
    </form>
  )
}

function PendingInvitations({ homeId }: { homeId: string }) {
  const queryClient = useQueryClient()
  const { data: invitations } = useQuery({
    queryKey: ['invitations', homeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('invitations').select('*').eq('home_id', homeId).is('accepted_at', null).is('revoked_at', null).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Revocar invitación?')) return
    await supabase.from('invitations').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['invitations', homeId] })
    toast.success('Revocada')
  }

  const active = invitations?.filter((inv) => new Date(inv.expires_at) > new Date()) ?? []
  if (!active.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase">Invitaciones pendientes</p>
      {active.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
          <div>
            <p className="text-xs text-gray-700">{inv.email ?? 'Enlace genérico'} — <span className="capitalize">{inv.role}</span></p>
            <p className="text-xs text-gray-400">Expira {new Date(inv.expires_at).toLocaleString('es-CO')}</p>
          </div>
          <button onClick={() => handleRevoke(inv.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Revocar</button>
        </div>
      ))}
    </div>
  )
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'owner': return 'bg-yellow-100 text-yellow-800'
    case 'admin': return 'bg-blue-100 text-blue-800'
    case 'member': return 'bg-green-100 text-green-800'
    case 'guest': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}
