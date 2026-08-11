import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useHomes, useHomeMembers } from '../homes/useHomes'
import { CreateHomePage } from '../homes/CreateHomePage'
import { TasksPanel } from '../tasks/TasksPanel'
import { FinancePanel } from '../finance/FinancePanel'
import { MaintenancePanel } from '../maintenance/MaintenancePanel'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Tab = 'tasks' | 'finance' | 'maintenance' | 'members'

export function DashboardPage() {
  const { session, signOut } = useAuth()
  const { data: homes, isLoading: homesLoading } = useHomes()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [activeHomeIndex, setActiveHomeIndex] = useState(0)

  const activeHome = homes?.[activeHomeIndex] ?? null
  const { data: members } = useHomeMembers(activeHome?.id ?? null)

  if (homesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  // No home yet — show create home
  if (!activeHome) {
    return <CreateHomePage onCreated={() => queryClient.invalidateQueries({ queryKey: ['homes'] })} />
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'tasks', label: 'Tareas', icon: '📋' },
    { key: 'finance', label: 'Finanzas', icon: '💰' },
    { key: 'maintenance', label: 'Mantenimiento', icon: '🔧' },
    { key: 'members', label: 'Miembros', icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {homes && homes.length > 1 ? (
              <select
                value={activeHomeIndex}
                onChange={(e) => setActiveHomeIndex(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-900"
                data-testid="home-selector"
              >
                {homes.map((home, idx) => (
                  <option key={home.id} value={idx}>🏠 {home.name}</option>
                ))}
              </select>
            ) : (
              <h1 className="text-xl font-bold text-gray-900">🏠 {activeHome?.name}</h1>
            )}
            {activeHome?.description && (
              <p className="text-sm text-gray-500 hidden md:block">{activeHome.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">{session?.user.email}</span>
            <button
              onClick={signOut}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              data-testid="dashboard-signout-button"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'tasks' && <TasksPanel homeId={activeHome.id} />}
        {activeTab === 'finance' && <FinancePanel homeId={activeHome.id} />}
        {activeTab === 'maintenance' && <MaintenancePanel homeId={activeHome.id} />}
        {activeTab === 'members' && <MembersPanel members={members} homeId={activeHome.id} />}
      </main>
    </div>
  )
}

function MembersPanel({ members, homeId }: { members: unknown[] | undefined; homeId: string }) {
  const [showInvite, setShowInvite] = useState(false)
  const { session } = useAuth()
  const queryClient = useQueryClient()

  if (!members) return <p className="text-gray-500">Cargando miembros...</p>

  const currentUserRole = (members as any[]).find((m: any) => m.user_id === session?.user.id)?.role

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('home_members')
      .update({ role: newRole })
      .eq('home_id', homeId)
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
    } else {
      queryClient.invalidateQueries({ queryKey: ['home-members', homeId] })
      toast.success('Rol actualizado')
    }
  }

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!confirm(`¿Eliminar a ${displayName} del hogar?`)) return
    const { error } = await supabase
      .from('home_members')
      .delete()
      .eq('home_id', homeId)
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
    } else {
      queryClient.invalidateQueries({ queryKey: ['home-members', homeId] })
      toast.success('Miembro eliminado')
    }
  }

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Miembros ({members.length})</h2>
        {canManage && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            data-testid="invite-member-button"
          >
            + Invitar
          </button>
        )}
      </div>

      {showInvite && <InviteMemberForm homeId={homeId} onDone={() => setShowInvite(false)} />}

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
                    title="Eliminar del hogar"
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

    // Generate token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('invitations').insert({
      home_id: homeId,
      invited_by: session.session.user.id,
      email: email || null,
      role,
      token,
      expires_at: expiresAt,
    })

    if (error) {
      toast.error(error.message)
    } else {
      const link = `${window.location.origin}/invite/${token}`
      setInviteLink(link)
      toast.success('Invitación creada')
    }

    setIsLoading(false)
  }

  if (inviteLink) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
        <p className="text-sm font-medium text-green-800">¡Invitación creada! Comparte este enlace:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"
          />
          <button
            onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copiado') }}
            className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white"
          >
            Copiar
          </button>
        </div>
        <p className="text-xs text-green-700">Expira en 24 horas</p>
        <button onClick={onDone} className="text-xs text-gray-600 underline">Cerrar</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <input
        type="email"
        placeholder="Email del invitado (opcional — deja vacío para enlace genérico)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="invite-email-input"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        data-testid="invite-role-select"
      >
        <option value="member">Miembro</option>
        <option value="guest">Invitado (solo ver + completar tareas)</option>
        <option value="admin">Admin</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          data-testid="invite-submit-button"
        >
          {isLoading ? 'Creando...' : 'Generar Invitación'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
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


