type Locale = 'es' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.tasks': 'Tareas',
    'nav.finance': 'Finanzas',
    'nav.maintenance': 'Mantenim.',
    'nav.calendar': 'Calendario',
    'nav.stats': 'Estadísticas',
    'nav.activity': 'Actividad',
    'nav.members': 'Miembros',
    'nav.settings': 'Config',
    'nav.signout': 'Salir',

    // Tasks
    'tasks.title': 'Tareas',
    'tasks.new': 'Nueva Tarea',
    'tasks.active': 'Tareas activas',
    'tasks.history': 'Historial',
    'tasks.all': 'Todas',
    'tasks.mine': 'Mías',
    'tasks.unassigned': 'Sin asignar',
    'tasks.overdue': 'Atrasada',
    'tasks.paused': 'Pausada',
    'tasks.rotation': 'Rotación',
    'tasks.complete': 'Completar tarea',
    'tasks.edit': 'Editar tarea',
    'tasks.delete': 'Eliminar tarea',
    'tasks.pause': 'Pausar tarea',
    'tasks.resume': 'Reactivar tarea',
    'tasks.completed': 'Tarea completada',
    'tasks.created': 'Tarea creada',
    'tasks.noTasks': 'No hay tareas. Crea la primera.',
    'tasks.addChecklist': 'Agregar checklist',
    'tasks.comment': 'Comentar',

    // Finance
    'finance.expenses': 'Gastos',
    'finance.balance': 'Balance',
    'finance.recurring': 'Recurrentes',
    'finance.budget': 'Presupuesto',
    'finance.shopping': 'Compras',
    'finance.newExpense': 'Nuevo Gasto',
    'finance.settle': 'Saldar',

    // Maintenance
    'maintenance.title': 'Mantenimientos',
    'maintenance.new': 'Nuevo',
    'maintenance.start': 'Iniciar',
    'maintenance.complete': 'Completar',
    'maintenance.pending': 'Pendiente',
    'maintenance.inProgress': 'En progreso',
    'maintenance.completed': 'Completado',
    'maintenance.highPriority': 'Alta',
    'maintenance.mediumPriority': 'Media',
    'maintenance.lowPriority': 'Baja',

    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.loading': 'Cargando...',
    'common.noResults': 'Sin resultados',
    'common.confirm': 'Confirmar',
    'common.search': 'Buscar tareas, gastos, mantenimientos...',

    // Settings
    'settings.title': 'Configuración',
    'settings.appearance': 'Apariencia',
    'settings.account': 'Cuenta',
    'settings.home': 'Hogar',
    'settings.categories': 'Categorías',
    'settings.data': 'Datos',
    'settings.light': 'Claro',
    'settings.dark': 'Oscuro',
    'settings.amoled': 'AMOLED',
    'settings.system': 'Sistema',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.tasks': 'Tasks',
    'nav.finance': 'Finance',
    'nav.maintenance': 'Maintenance',
    'nav.calendar': 'Calendar',
    'nav.stats': 'Statistics',
    'nav.activity': 'Activity',
    'nav.members': 'Members',
    'nav.settings': 'Settings',
    'nav.signout': 'Sign out',

    // Tasks
    'tasks.title': 'Tasks',
    'tasks.new': 'New Task',
    'tasks.active': 'Active tasks',
    'tasks.history': 'History',
    'tasks.all': 'All',
    'tasks.mine': 'Mine',
    'tasks.unassigned': 'Unassigned',
    'tasks.overdue': 'Overdue',
    'tasks.paused': 'Paused',
    'tasks.rotation': 'Rotation',
    'tasks.complete': 'Complete task',
    'tasks.edit': 'Edit task',
    'tasks.delete': 'Delete task',
    'tasks.pause': 'Pause task',
    'tasks.resume': 'Resume task',
    'tasks.completed': 'Task completed',
    'tasks.created': 'Task created',
    'tasks.noTasks': 'No tasks yet. Create the first one.',
    'tasks.addChecklist': 'Add checklist',
    'tasks.comment': 'Comment',

    // Finance
    'finance.expenses': 'Expenses',
    'finance.balance': 'Balance',
    'finance.recurring': 'Recurring',
    'finance.budget': 'Budget',
    'finance.shopping': 'Shopping',
    'finance.newExpense': 'New Expense',
    'finance.settle': 'Settle',

    // Maintenance
    'maintenance.title': 'Maintenance',
    'maintenance.new': 'New',
    'maintenance.start': 'Start',
    'maintenance.complete': 'Complete',
    'maintenance.pending': 'Pending',
    'maintenance.inProgress': 'In progress',
    'maintenance.completed': 'Completed',
    'maintenance.highPriority': 'High',
    'maintenance.mediumPriority': 'Medium',
    'maintenance.lowPriority': 'Low',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.loading': 'Loading...',
    'common.noResults': 'No results',
    'common.confirm': 'Confirm',
    'common.search': 'Search tasks, expenses, maintenance...',

    // Settings
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.account': 'Account',
    'settings.home': 'Home',
    'settings.categories': 'Categories',
    'settings.data': 'Data',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.amoled': 'AMOLED',
    'settings.system': 'System',
  },
}

let currentLocale: Locale = (localStorage.getItem('locale') as Locale) ?? 'es'

export function setLocale(locale: Locale) {
  currentLocale = locale
  localStorage.setItem('locale', locale)
  // Trigger re-render by dispatching event
  window.dispatchEvent(new Event('locale-change'))
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: string): string {
  return translations[currentLocale][key] ?? key
}

export function useLocale() {
  const [, setTick] = useState(0)

  // Re-render when locale changes
  useState(() => {
    const handler = () => setTick((t) => t + 1)
    window.addEventListener('locale-change', handler)
    return () => window.removeEventListener('locale-change', handler)
  })

  return { t, locale: currentLocale, setLocale }
}

// Fix: need useState import
import { useState } from 'react'
