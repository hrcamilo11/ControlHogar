import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Wallet, Wrench, AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

interface SummaryData {
  tasksToday: number
  tasksOverdue: number
  monthExpenses: number
  maintenancePending: number
}

export function SummaryCards({ homeId }: { homeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['summary', homeId],
    queryFn: async (): Promise<SummaryData> => {
      const now = new Date()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Tasks due today or overdue
      const { data: tasks } = await supabase
        .from('tasks')
        .select('next_due_date')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)

      const tasksToday = (tasks ?? []).filter(
        (t) => t.next_due_date && new Date(t.next_due_date) <= new Date(todayEnd) && new Date(t.next_due_date) >= new Date(now.toISOString().split('T')[0]!)
      ).length

      const tasksOverdue = (tasks ?? []).filter(
        (t) => t.next_due_date && new Date(t.next_due_date) < now
      ).length

      // Month expenses total
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('home_id', homeId)
        .gte('created_at', monthStart)

      const monthExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

      // Pending maintenance
      const { count } = await supabase
        .from('maintenances')
        .select('*', { count: 'exact', head: true })
        .eq('home_id', homeId)
        .in('status', ['pending', 'in_progress'])

      return {
        tasksToday,
        tasksOverdue,
        monthExpenses,
        maintenancePending: count ?? 0,
      }
    },
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="mt-2 h-7 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  const cards: { label: string; value: number | string; icon: ReactNode; color: string; alert?: string; alertColor?: string }[] = [
    {
      label: 'Tareas hoy',
      value: data?.tasksToday ?? 0,
      icon: <ClipboardList className="h-6 w-6 text-blue-500" />,
      color: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-transparent',
      alert: (data?.tasksOverdue ?? 0) > 0 ? `${data?.tasksOverdue} atrasadas` : undefined,
      alertColor: 'text-red-600',
    },
    {
      label: 'Gasto del mes',
      value: `$${(data?.monthExpenses ?? 0).toLocaleString('es-CO')}`,
      icon: <Wallet className="h-6 w-6 text-green-500" />,
      color: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-transparent',
    },
    {
      label: 'Mantenimientos',
      value: data?.maintenancePending ?? 0,
      icon: <Wrench className="h-6 w-6 text-orange-500" />,
      color: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-transparent',
      alert: (data?.maintenancePending ?? 0) > 3 ? 'Acumulados' : undefined,
      alertColor: 'text-orange-600',
    },
    {
      label: 'Tareas atrasadas',
      value: data?.tasksOverdue ?? 0,
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
      color: (data?.tasksOverdue ?? 0) > 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-transparent' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-transparent',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
          <div className="flex items-center justify-between">
            <span className="text-2xl">{card.icon}</span>
            {card.alert && <span className={`text-xs font-medium ${card.alertColor}`}>{card.alert}</span>}
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          <p className="text-sm text-gray-600">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
