import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { ShoppingList } from './ShoppingList'
import { RecurringPayments } from './RecurringPayments'
import { BudgetPanel } from './BudgetPanel'

interface Expense {
  id: string
  title: string
  amount: number
  category_id: string | null
  paid_by: string
  split_type: string
  created_at: string
  profiles?: { display_name: string } | null
}

interface MemberBalance {
  userId: string
  displayName: string
  netBalance: number
}

export function FinancePanel({ homeId }: { homeId: string }) {
  const [activeView, setActiveView] = useState<'expenses' | 'balance' | 'recurring' | 'budget' | 'shopping'>('expenses')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setActiveView('expenses')}
          className={`text-sm font-medium ${activeView === 'expenses' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          Gastos
        </button>
        <button
          onClick={() => setActiveView('balance')}
          className={`text-sm font-medium ${activeView === 'balance' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          Balance
        </button>
        <button
          onClick={() => setActiveView('recurring')}
          className={`text-sm font-medium ${activeView === 'recurring' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          📅 Recurrentes
        </button>
        <button
          onClick={() => setActiveView('budget')}
          className={`text-sm font-medium ${activeView === 'budget' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          📊 Presupuesto
        </button>
        <button
          onClick={() => setActiveView('shopping')}
          className={`text-sm font-medium ${activeView === 'shopping' ? 'text-primary-600 underline' : 'text-gray-500'}`}
        >
          🛒 Compras
        </button>
      </div>

      {activeView === 'expenses' && <ExpensesView homeId={homeId} />}
      {activeView === 'balance' && <BalanceView homeId={homeId} />}
      {activeView === 'recurring' && <RecurringPayments homeId={homeId} />}
      {activeView === 'budget' && <BudgetPanel homeId={homeId} />}
      {activeView === 'shopping' && <ShoppingList homeId={homeId} />}
    </div>
  )
}

function ExpensesView({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, profiles:paid_by(display_name)')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as Expense[]
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando gastos...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Gastos ({expenses?.length ?? 0})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          data-testid="expense-add-button"
        >
          + Nuevo Gasto
        </button>
      </div>

      {showForm && (
        <CreateExpenseForm
          homeId={homeId}
          onCreated={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
            queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {expenses?.length === 0 && !showForm && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No hay gastos registrados. ¡Registra el primero!</p>
        </div>
      )}

      <div className="space-y-2">
        {expenses?.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} homeId={homeId} />
        ))}
      </div>
    </div>
  )
}

function ExpenseCard({ expense, homeId }: { expense: Expense; homeId: string }) {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
    if (error) {
      toast.error(error.message)
    } else {
      queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
      queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
      toast.success('Gasto eliminado')
    }
  }

  const canDelete = expense.paid_by === session?.user.id

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h3 className="font-medium text-gray-900">{expense.title}</h3>
        <p className="text-xs text-gray-500">
          Pagó: {expense.profiles?.display_name ?? 'Tú'} · {new Date(expense.created_at).toLocaleDateString('es-CO')}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-gray-900">
          ${Number(expense.amount).toLocaleString('es-CO')}
        </span>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-600"
            title="Eliminar gasto"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

function CreateExpenseForm({
  homeId,
  onCreated,
  onCancel,
}: {
  homeId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_members')
        .select('user_id, profiles(display_name)')
        .eq('home_id', homeId)
      if (error) throw error
      return data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').order('name')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setIsLoading(true)

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Monto inválido')
      setIsLoading(false)
      return
    }

    // Create expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        home_id: homeId,
        title,
        amount: numericAmount,
        paid_by: session.user.id,
        split_type: 'equal',
        category_id: categoryId || null,
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    // Upload receipt if provided
    if (receiptFile) {
      const filePath = `${homeId}/${expense.id}.${receiptFile.name.split('.').pop()}`
      await supabase.storage.from('receipts').upload(filePath, receiptFile)
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath)
      await supabase.from('expenses').update({ receipt_url: urlData.publicUrl }).eq('id', expense.id)
    }

    // Create equal splits for all members (excluding payer)
    const otherMembers = members?.filter((m) => m.user_id !== session.user.id) ?? []
    if (otherMembers.length > 0) {
      const allCount = (members?.length ?? 1)
      const sharePerPerson = Math.round((numericAmount / allCount) * 100) / 100

      const splits = otherMembers.map((m) => ({
        expense_id: expense.id,
        user_id: m.user_id,
        amount: sharePerPerson,
        percentage: Math.round((100 / allCount) * 100) / 100,
      }))

      await supabase.from('expense_splits').insert(splits)
    }

    toast.success('Gasto registrado')
    onCreated()
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <input
        type="text"
        required
        placeholder="¿En qué se gastó?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="expense-form-title"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          data-testid="expense-form-amount"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          data-testid="expense-form-category"
        >
          <option value="">Sin categoría</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <span className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50">📎 {receiptFile ? receiptFile.name : 'Adjuntar recibo'}</span>
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Se dividirá equitativamente entre {members?.length ?? 1} miembros
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          data-testid="expense-form-submit"
        >
          {isLoading ? 'Registrando...' : 'Registrar Gasto'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function BalanceView({ homeId }: { homeId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: balances, isLoading } = useQuery({
    queryKey: ['balance', homeId],
    queryFn: async () => {
      // Get all splits
      const { data: splits } = await supabase
        .from('expense_splits')
        .select('user_id, amount, expenses!inner(home_id, paid_by)')
        .eq('expenses.home_id', homeId)

      // Get members
      const { data: members } = await supabase
        .from('home_members')
        .select('user_id, profiles(display_name)')
        .eq('home_id', homeId)

      // Get settlements
      const { data: settlements } = await supabase
        .from('settlements')
        .select('*')
        .eq('home_id', homeId)
        .eq('confirmed', true)

      // Calculate balances
      const debts: Record<string, Record<string, number>> = {}

      for (const split of splits ?? []) {
        const expense = split.expenses as unknown as { paid_by: string }
        const creditor = expense.paid_by
        const debtor = split.user_id
        const amount = Number(split.amount)

        if (!debts[debtor]) debts[debtor] = {}
        debts[debtor][creditor] = (debts[debtor][creditor] ?? 0) + amount
      }

      // Subtract settlements
      for (const s of settlements ?? []) {
        const fromDebts = debts[s.from_user]
        if (fromDebts && fromDebts[s.to_user]) {
          fromDebts[s.to_user] = Math.max(0, fromDebts[s.to_user] - Number(s.amount))
        }
      }

      // Build member balances
      const memberMap = new Map(
        (members ?? []).map((m) => [m.user_id, (m.profiles as any)?.display_name ?? 'Desconocido'])
      )

      const result: MemberBalance[] = []
      for (const [userId, name] of memberMap) {
        let totalOwed = 0
        let totalOwes = 0

        // What others owe this user
        for (const [debtor, creditors] of Object.entries(debts)) {
          if (creditors[userId] && creditors[userId] > 0.01) {
            totalOwed += creditors[userId]
          }
        }

        // What this user owes others
        if (debts[userId]) {
          for (const amount of Object.values(debts[userId])) {
            if (amount > 0.01) totalOwes += amount
          }
        }

        result.push({
          userId,
          displayName: name,
          netBalance: Math.round((totalOwed - totalOwes) * 100) / 100,
        })
      }

      return result
    },
  })

  if (isLoading) return <p className="text-gray-500">Calculando balance...</p>

  const handleSettle = async (member: MemberBalance) => {
    const amount = Math.abs(member.netBalance)
    const creditors = balances?.filter((b) => b.netBalance > 0) ?? []
    if (creditors.length === 0) return

    const topCreditor = creditors.sort((a, b) => b.netBalance - a.netBalance)[0]
    if (!topCreditor) return
    const settleAmount = Math.min(amount, topCreditor.netBalance)

    if (!confirm(`¿Registrar pago de $${settleAmount.toLocaleString('es-CO')} a ${topCreditor.displayName}?`)) return

    const { error } = await supabase.from('settlements').insert({
      home_id: homeId,
      from_user: session!.user.id,
      to_user: topCreditor.userId,
      amount: settleAmount,
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })

    if (error) {
      toast.error(error.message)
    } else {
      queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
      toast.success(`Deuda saldada: $${settleAmount.toLocaleString('es-CO')} a ${topCreditor.displayName}`)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Balance del Hogar</h2>

      {balances?.length === 0 && (
        <p className="text-gray-500">No hay gastos registrados aún.</p>
      )}

      <div className="space-y-2">
        {balances?.map((member) => (
          <div key={member.userId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                {member.displayName[0]?.toUpperCase()}
              </div>
              <span className="font-medium text-gray-900">
                {member.displayName}
                {member.userId === session?.user.id && ' (tú)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${member.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {member.netBalance >= 0 ? '+' : ''}${Math.abs(member.netBalance).toLocaleString('es-CO')}
              </span>
              {member.netBalance < 0 && member.userId === session?.user.id && (
                <button
                  onClick={() => handleSettle(member)}
                  className="rounded border border-green-400 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                >
                  💸 Saldar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Verde = le deben dinero · Rojo = debe dinero a otros
      </p>
    </div>
  )
}
