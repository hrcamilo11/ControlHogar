import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import toast from 'react-hot-toast'

interface Budget {
  id: string
  category_id: string
  amount: number
  month: number
  year: number
  expense_categories: { name: string }
}

export function BudgetPanel({ homeId }: { homeId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', homeId, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, expense_categories(name)')
        .eq('home_id', homeId)
        .eq('month', currentMonth)
        .eq('year', currentYear)

      if (error) throw error
      return data as Budget[]
    },
  })

  const { data: expenses } = useQuery({
    queryKey: ['expenses-month', homeId, currentMonth, currentYear],
    queryFn: async () => {
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from('expenses')
        .select('amount, category_id')
        .eq('home_id', homeId)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      if (error) throw error
      return data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })

  // Calculate spent per category
  const spentByCategory: Record<string, number> = {}
  for (const exp of expenses ?? []) {
    const catId = exp.category_id ?? 'uncategorized'
    spentByCategory[catId] = (spentByCategory[catId] ?? 0) + Number(exp.amount)
  }

  const handleCreateBudget = async (categoryId: string, amount: number) => {
    const { error } = await supabase.from('budgets').insert({
      home_id: homeId,
      category_id: categoryId,
      amount,
      month: currentMonth,
      year: currentYear,
      created_by: session!.user.id,
    })

    if (error) {
      toast.error(error.message)
    } else {
      queryClient.invalidateQueries({ queryKey: ['budgets', homeId] })
      toast.success('Presupuesto definido')
      setShowForm(false)
    }
  }

  if (isLoading) return <p className="text-gray-500">Cargando presupuesto...</p>

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Presupuesto — {monthNames[currentMonth - 1]} {currentYear}
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Definir
        </button>
      </div>

      {showForm && (
        <BudgetForm
          categories={categories ?? []}
          existingBudgets={budgets ?? []}
          onSubmit={handleCreateBudget}
          onCancel={() => setShowForm(false)}
        />
      )}

      {budgets?.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">No hay presupuestos definidos para este mes.</p>
      )}

      <div className="space-y-3">
        {budgets?.map((budget) => {
          const spent = spentByCategory[budget.category_id] ?? 0
          const percentage = Math.round((spent / budget.amount) * 100)
          const isOver = percentage >= 100
          const isWarning = percentage >= 80 && percentage < 100

          return (
            <div key={budget.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {budget.expense_categories?.name ?? 'Sin categoría'}
                </span>
                <span className={`text-sm font-semibold ${isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
                  ${spent.toLocaleString('es-CO')} / ${Number(budget.amount).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {percentage}% usado
                {isOver && ' — Presupuesto excedido'}
                {isWarning && ' — Cerca del límite'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BudgetForm({
  categories,
  existingBudgets,
  onSubmit,
  onCancel,
}: {
  categories: { id: string; name: string }[]
  existingBudgets: Budget[]
  onSubmit: (categoryId: string, amount: number) => void
  onCancel: () => void
}) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')

  const existingCategoryIds = existingBudgets.map((b) => b.category_id)
  const availableCategories = categories.filter((c) => !existingCategoryIds.includes(c.id))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Seleccionar categoría</option>
        {availableCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      <input
        type="number"
        min="1"
        step="1"
        placeholder="Monto del presupuesto"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (categoryId && amount) onSubmit(categoryId, parseFloat(amount)) }}
          disabled={!categoryId || !amount}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          Guardar
        </button>
        <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
          Cancelar
        </button>
      </div>
    </div>
  )
}
