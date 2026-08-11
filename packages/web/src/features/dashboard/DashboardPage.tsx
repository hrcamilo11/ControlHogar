import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useHomes, useHomeMembers } from '../homes/useHomes'
import { CreateHomePage } from '../homes/CreateHomePage'
import { TasksPanel } from '../tasks/TasksPanel'
import { useQueryClient } from '@tanstack/react-query'

type Tab = 'tasks' | 'finance' | 'maintenance' | 'members'

export function DashboardPage() {
  const { session, signOut } = useAuth()
  const { data: homes, isLoading: homesLoading } = useHomes()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('tasks')

  const activeHome = homes?.[0] ?? null
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
          <div>
            <h1 className="text-xl font-bold text-gray-900">🏠 {activeHome.name}</h1>
            {activeHome.description && (
              <p className="text-sm text-gray-500">{activeHome.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session?.user.email}</span>
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
        {activeTab === 'finance' && <FinancePlaceholder />}
        {activeTab === 'maintenance' && <MaintenancePlaceholder />}
        {activeTab === 'members' && <MembersPanel members={members} homeId={activeHome.id} />}
      </main>
    </div>
  )
}

function MembersPanel({ members, homeId }: { members: unknown[] | undefined; homeId: string }) {
  if (!members) return <p className="text-gray-500">Cargando miembros...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Miembros ({members.length})</h2>
      </div>
      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {members.map((member: any) => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                {member.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{member.profiles?.display_name}</p>
                <p className="text-xs text-gray-500">{member.profiles?.email}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
              {member.role}
            </span>
          </div>
        ))}
      </div>
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

function FinancePlaceholder() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <div className="text-4xl">💰</div>
      <h3 className="mt-2 text-lg font-medium text-gray-900">Finanzas</h3>
      <p className="mt-1 text-sm text-gray-500">Módulo de gastos, presupuestos y balance — próximamente</p>
    </div>
  )
}

function MaintenancePlaceholder() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <div className="text-4xl">🔧</div>
      <h3 className="mt-2 text-lg font-medium text-gray-900">Mantenimiento</h3>
      <p className="mt-1 text-sm text-gray-500">Módulo de arreglos y mantenimientos — próximamente</p>
    </div>
  )
}
