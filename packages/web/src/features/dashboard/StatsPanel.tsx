import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function StatsPanel({ homeId }: { homeId: string }) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: expensesByCategory } = useQuery({
    queryKey: ['stats-expenses-category', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, expense_categories(name)')
        .eq('home_id', homeId)
        .gte('created_at', monthStart)

      if (error) throw error
      const grouped: Record<string, number> = {}
      for (const e of data ?? []) {
        const catName = (e.expense_categories as any)?.name ?? 'Sin categoría'
        grouped[catName] = (grouped[catName] ?? 0) + Number(e.amount)
      }
      return Object.entries(grouped)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
    },
  })

  const { data: completionsByMember } = useQuery({
    queryKey: ['stats-completions', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_completions')
        .select('completed_by, profiles:completed_by(display_name), tasks!inner(home_id)')
        .eq('tasks.home_id', homeId)
        .gte('completed_at', monthStart)

      if (error) throw error
      const grouped: Record<string, { name: string; count: number }> = {}
      for (const c of data ?? []) {
        const userId = c.completed_by
        if (!grouped[userId]) {
          grouped[userId] = { name: (c.profiles as any)?.display_name ?? 'Desconocido', count: 0 }
        }
        grouped[userId]!.count++
      }
      return Object.values(grouped).sort((a, b) => b.count - a.count)
    },
  })

  const maxExpense = Math.max(...(expensesByCategory ?? []).map((e) => e.total), 1)
  const maxCompletions = Math.max(...(completionsByMember ?? []).map((m) => m.count), 1)

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Estadísticas — {monthNames[now.getMonth()]} {now.getFullYear()}</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses by category */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Gastos por Categoría</h3>
          {(!expensesByCategory || expensesByCategory.length === 0) ? (
            <p className="text-sm text-gray-500">Sin gastos este mes</p>
          ) : (
            <div className="space-y-3">
              {expensesByCategory.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{cat.name}</span>
                    <span className="font-medium text-gray-900">${cat.total.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${(cat.total / maxExpense) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completions by member */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tareas Completadas por Miembro</h3>
          {(!completionsByMember || completionsByMember.length === 0) ? (
            <p className="text-sm text-gray-500">Sin completaciones este mes</p>
          ) : (
            <div className="space-y-3">
              {completionsByMember.map((member) => (
                <div key={member.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{member.name}</span>
                    <span className="font-medium text-gray-900">{member.count} tareas</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${(member.count / maxCompletions) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Report — now handled by CSV export in Settings */}
    </div>
  )
}
