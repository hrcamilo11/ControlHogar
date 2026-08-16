import { useState } from 'react'
import { ClipboardList, Wallet, Users, Calendar, Settings, ArrowRight, X } from 'lucide-react'

const steps = [
  {
    icon: ClipboardList,
    title: 'Tareas del hogar',
    description: 'Crea tareas recurrentes, asigna responsables y activa la rotación equitativa. También puedes registrar mantenimientos con prioridad y fotos.',
  },
  {
    icon: Wallet,
    title: 'Finanzas compartidas',
    description: 'Registra gastos, divide cuentas de forma equitativa o personalizada. Gestiona pagos recurrentes y presupuestos por categoría.',
  },
  {
    icon: Users,
    title: 'Tu hogar, tu equipo',
    description: 'Invita miembros con un enlace. Asigna roles (admin, miembro, invitado) para controlar quién puede crear y editar.',
  },
  {
    icon: Calendar,
    title: 'Todo bajo control',
    description: 'Calendario unificado, notificaciones de vencimientos y estadísticas de completación. Atajos: Ctrl+K para buscar, Ctrl+N para nueva tarea.',
  },
  {
    icon: Settings,
    title: 'Personalízalo',
    description: 'Elige tema (claro, oscuro, AMOLED), color de acento y configura tu perfil. Exporta datos en CSV cuando quieras.',
  },
]

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)

  const current = steps[step]!
  const Icon = current.icon
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <Icon className="h-8 w-8 text-primary-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.title}</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{current.description}</p>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-primary-600' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-sm text-gray-500 hover:text-gray-700">
              Anterior
            </button>
          ) : (
            <span />
          )}

          <button
            onClick={() => {
              if (isLast) onComplete()
              else setStep(step + 1)
            }}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            {isLast ? 'Comenzar' : 'Siguiente'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

const ONBOARDING_KEY = 'onboarding-completed'

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY)
  })

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
  }

  return { showOnboarding, completeOnboarding }
}
