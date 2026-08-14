import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Moon, Sun, Monitor, User, Lock, Bell } from 'lucide-react'

type Theme = 'light' | 'dark' | 'amoled' | 'system'

export function SettingsPanel() {
  const { session, signOut } = useAuth()
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'system'
  })
  const [displayName, setDisplayName] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  useEffect(() => {
    // Load profile
    if (session?.user.id) {
      supabase.from('profiles').select('display_name').eq('id', session.user.id).single().then(({ data }) => {
        if (data) setDisplayName(data.display_name)
      })
    }
  }, [session?.user.id])

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setIsUpdatingProfile(true)
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', session!.user.id)
    if (error) toast.error(error.message)
    else toast.success('Perfil actualizado')
    setIsUpdatingProfile(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuración</h2>

      {/* Theme */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Apariencia</h3>
        <div className="flex gap-3 flex-wrap">
          {([
            { value: 'light', label: 'Claro', icon: Sun },
            { value: 'dark', label: 'Oscuro', icon: Moon },
            { value: 'amoled', label: 'AMOLED', icon: Moon },
            { value: 'system', label: 'Sistema', icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 transition-all ${
                theme === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
              }`}
            >
              <Icon className={`h-6 w-6 ${theme === value ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'}`} />
              <span className={`text-sm font-medium ${theme === value ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Profile */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"><User className="h-4 w-4" /> Perfil</h3>
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Email</label>
            <p className="text-sm text-gray-900 dark:text-gray-100">{session?.user.email}</p>
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Nombre</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                maxLength={50}
              />
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"><Lock className="h-4 w-4" /> Seguridad</h3>
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={async () => {
              const { error } = await supabase.auth.resetPasswordForEmail(session!.user.email!)
              if (error) toast.error(error.message)
              else toast.success('Email de cambio de contraseña enviado')
            }}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium dark:text-primary-400"
          >
            Cambiar contraseña
          </button>
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <button
              onClick={() => { if (confirm('¿Cerrar sesión?')) signOut() }}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.classList.remove('dark', 'amoled')

  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'amoled') {
    root.classList.add('dark', 'amoled')
  } else if (theme === 'light') {
    // No class needed
  } else {
    // System
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    }
  }
}
