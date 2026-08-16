import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { ShoppingList } from './ShoppingList'
import { RecurringPayments } from './RecurringPayments'
import { BudgetPanel } from './BudgetPanel'
import { Pencil, Trash2, Paperclip, Banknote } from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'

interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  category_id: string | null
  paid_by: string
  split_type: string
  receipt_url: string | null
  task_id: string | null
  created_at: string
  profiles?: { display_name: string } | null
  expense_categories?: { name: string } | null
  tasks?: { title: string } | null
}

interface MemberBalance {
  userId: string
  displayName: string
  netBalance: number
  owes: { toUserId: string; toName: string; amount: number }[]
  isOwed: { fromUserId: string; fromName: string; amount: number }[]
}

interface Member {
  user_id: string
  profiles: { display_name: string } | null
}

export function FinancePanel({ homeId }: { homeId: string }) {
  const [activeView, setActiveView] = useState<'expenses' | 'balance' | 'recurring' | 'budget' | 'shopping'>('expenses')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(['expenses', 'balance', 'recurring', 'budget', 'shopping'] as const).map((view) => {
          const labels = { expenses: 'Gastos', balance: 'Balance', recurring: 'Recurrentes', budget: 'Presupuesto', shopping: 'Compras' }
          return (
            <button key={view} onClick={() => setActiveView(view)} className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${activeView === view ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              {labels[view]}
            </button>
          )
        })}
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPaidBy, setFilterPaidBy] = useState('')
  const queryClient = useQueryClient()

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, profiles:paid_by(display_name), expense_categories(name), tasks(title)')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as Expense[]
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('expense_categories').select('*').order('name')
      return data as { id: string; name: string }[]
    },
  })

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('user_id, profiles(display_name)').eq('home_id', homeId)
      return (data ?? []).map((m: any) => ({ user_id: m.user_id, profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles })) as Member[]
    },
  })

  // Apply filters
  const filtered = expenses?.filter((e) => {
    if (filterCategory && e.category_id !== filterCategory) return false
    if (filterPaidBy && e.paid_by !== filterPaidBy) return false
    return true
  })

  const totalFiltered = filtered?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0

  if (isLoading) return <p className="text-gray-500">Cargando gastos...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Gastos ({filtered?.length ?? 0})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditingExpense(null) }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" data-testid="expense-add-button">+ Nuevo Gasto</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Category filter chips */}
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => setFilterCategory('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!filterCategory ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>Todas</button>
          {categories?.map((c) => (
            <button key={c.id} onClick={() => setFilterCategory(c.id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filterCategory === c.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{c.name}</button>
          ))}
        </div>
        {/* Paid-by filter chips */}
        {members && members.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-500">Pagó:</span>
            <button onClick={() => setFilterPaidBy('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!filterPaidBy ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>Todos</button>
            {members.map((m) => (
              <button key={m.user_id} onClick={() => setFilterPaidBy(m.user_id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filterPaidBy === m.user_id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{m.profiles?.display_name}</button>
            ))}
          </div>
        )}
        {(filterCategory || filterPaidBy) && (
          <span className="text-xs text-gray-500">Total: ${totalFiltered.toLocaleString('es-CO')}</span>
        )}
      </div>

      {(showForm || editingExpense) && (
        <CreateExpenseForm
          homeId={homeId}
          members={members ?? []}
          categories={categories ?? []}
          editingExpense={editingExpense}
          onCreated={() => {
            setShowForm(false)
            setEditingExpense(null)
            queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
            queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
          }}
          onCancel={() => { setShowForm(false); setEditingExpense(null) }}
        />
      )}

      {filtered?.length === 0 && !showForm && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No hay gastos registrados.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered?.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} homeId={homeId} onEdit={() => { setEditingExpense(expense); setShowForm(false) }} />
        ))}
      </div>
    </div>
  )
}

function ExpenseCard({ expense, homeId, onEdit }: { expense: Expense; homeId: string; onEdit: () => void }) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const confirm = useConfirm()
  const [showReceipt, setShowReceipt] = useState(false)

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Eliminar gasto', message: '¿Eliminar este gasto? El balance se recalculará.', confirmText: 'Eliminar', variant: 'danger' }))) return
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
    if (error) toast.error(error.message)
    else {
      queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
      queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
      toast.success('Gasto eliminado')
    }
  }

  const canModify = expense.paid_by === session?.user.id

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{expense.title}</h3>
            {expense.expense_categories?.name && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{expense.expense_categories.name}</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span>Pagó: {expense.profiles?.display_name ?? 'Tú'}</span>
            <span>{new Date(expense.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="capitalize">{expense.split_type === 'equal' ? 'Equitativo' : expense.split_type === 'percentage' ? 'Por %' : expense.split_type === 'fixed' ? 'Montos fijos' : ''}</span>
            {expense.receipt_url && (
              <button onClick={() => setShowReceipt(!showReceipt)} className="flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium">
                <Paperclip className="h-3 w-3" /> Recibo
              </button>
            )}
            {expense.tasks?.title && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{expense.tasks.title}</span>
            )}
          </div>
          {expense.description && <p className="mt-1 text-sm text-gray-600">{expense.description}</p>}
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">${Number(expense.amount).toLocaleString('es-CO')}</span>
          {canModify && (
            <>
              <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-colors" title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleDelete} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Eliminar">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* Receipt modal */}
      {showReceipt && expense.receipt_url && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <img src={expense.receipt_url} alt="Recibo" className="max-h-64 rounded-lg border border-gray-200" />
        </div>
      )}
    </div>
  )
}

function CreateExpenseForm({ homeId, members, categories, editingExpense, onCreated, onCancel }: {
  homeId: string; members: Member[]; categories: { id: string; name: string }[]; editingExpense: Expense | null; onCreated: () => void; onCancel: () => void
}) {
  const { session } = useAuth()
  const [title, setTitle] = useState(editingExpense?.title ?? '')
  const [description, setDescription] = useState(editingExpense?.description ?? '')
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : '')
  const [categoryId, setCategoryId] = useState(editingExpense?.category_id ?? '')
  const [taskId, setTaskId] = useState(editingExpense?.task_id ?? '')
  const [paidBy, setPaidBy] = useState(editingExpense?.paid_by ?? session?.user.id ?? '')
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'fixed'>(
    (editingExpense?.split_type as any) ?? 'equal'
  )
  const [participants, setParticipants] = useState<string[]>(
    members.map((m) => m.user_id) // default: everyone
  )
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: homeTasks } = useQuery({
    queryKey: ['tasks-for-expense', homeId],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('id, title').eq('home_id', homeId).eq('is_active', true).order('title')
      return data as { id: string; title: string }[] ?? []
    },
  })

  const toggleParticipant = (uid: string) => {
    if (uid === paidBy) return // Payer is always a participant
    setParticipants((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    if (!title.trim()) { toast.error('El título no puede estar vacío'); return }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) { toast.error('Monto inválido'); return }

    // Validate splits
    if (splitType === 'percentage') {
      const total = participants.filter((p) => p !== paidBy).reduce((sum, uid) => sum + (parseFloat(customSplits[uid] ?? '0') || 0), 0)
      if (Math.abs(total - 100) > 0.1) { toast.error(`Los porcentajes deben sumar 100% (actual: ${total.toFixed(1)}%)`); return }
    }
    if (splitType === 'fixed') {
      const total = participants.filter((p) => p !== paidBy).reduce((sum, uid) => sum + (parseFloat(customSplits[uid] ?? '0') || 0), 0)
      const expectedTotal = numericAmount * (participants.filter((p) => p !== paidBy).length / participants.length)
      // For fixed, the sum of fixed amounts should represent what others owe
      // We don't enforce exact total since payer's share is implicit
    }

    if (participants.length < 1) { toast.error('Debe haber al menos 1 participante'); return }

    setIsLoading(true)

    if (editingExpense) {
      // Update existing
      const { error } = await supabase.from('expenses').update({
        title: title.trim(), description: description.trim() || null,
        amount: numericAmount, category_id: categoryId || null,
        paid_by: paidBy, split_type: splitType, task_id: taskId || null,
      }).eq('id', editingExpense.id)

      if (error) { toast.error(error.message); setIsLoading(false); return }

      // Recreate splits
      await supabase.from('expense_splits').delete().eq('expense_id', editingExpense.id)
      await createSplits(editingExpense.id, numericAmount)

      toast.success('Gasto actualizado')
    } else {
      // Create new
      const { data: expense, error } = await supabase.from('expenses').insert({
        home_id: homeId, title: title.trim(), description: description.trim() || null,
        amount: numericAmount, paid_by: paidBy, split_type: splitType,
        category_id: categoryId || null, task_id: taskId || null,
      }).select().single()

      if (error) { toast.error(error.message); setIsLoading(false); return }

      // Upload receipt
      if (receiptFile) {
        const filePath = `${homeId}/${expense.id}.${receiptFile.name.split('.').pop()}`
        await supabase.storage.from('receipts').upload(filePath, receiptFile)
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath)
        await supabase.from('expenses').update({ receipt_url: urlData.publicUrl }).eq('id', expense.id)
      }

      await createSplits(expense.id, numericAmount)
      toast.success('Gasto registrado')
    }

    onCreated()
    setIsLoading(false)
  }

  const createSplits = async (expenseId: string, totalAmount: number) => {
    const debtors = participants.filter((p) => p !== paidBy)
    if (debtors.length === 0) return

    let splits: { expense_id: string; user_id: string; amount: number; percentage: number | null }[]

    switch (splitType) {
      case 'equal': {
        const share = Math.round((totalAmount / participants.length) * 100) / 100
        splits = debtors.map((uid) => ({
          expense_id: expenseId, user_id: uid,
          amount: share, percentage: Math.round((100 / participants.length) * 100) / 100,
        }))
        break
      }
      case 'percentage': {
        splits = debtors.map((uid) => {
          const pct = parseFloat(customSplits[uid] ?? '0') || 0
          return {
            expense_id: expenseId, user_id: uid,
            amount: Math.round((totalAmount * pct / 100) * 100) / 100,
            percentage: pct,
          }
        })
        break
      }
      case 'fixed': {
        splits = debtors.map((uid) => ({
          expense_id: expenseId, user_id: uid,
          amount: Math.round((parseFloat(customSplits[uid] ?? '0') || 0) * 100) / 100,
          percentage: null,
        }))
        break
      }
    }

    await supabase.from('expense_splits').insert(splits)
  }

  const debtors = participants.filter((p) => p !== paidBy)

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-primary-700 uppercase">{editingExpense ? 'Editando gasto' : 'Nuevo gasto'}</p>

      <input type="text" required placeholder="¿En qué se gastó?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />

      <input type="text" placeholder="Descripción o notas (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />

      <div className="grid grid-cols-2 gap-2">
        <input type="number" required min="0.01" step="0.01" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Categoría</label>
          <div className="flex gap-1 flex-wrap">
            <button type="button" onClick={() => setCategoryId('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!categoryId ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>Ninguna</button>
            {categories.map((c) => (
              <button type="button" key={c.id} onClick={() => setCategoryId(c.id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${categoryId === c.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{c.name}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Associate with task */}
      {homeTasks && homeTasks.length > 0 && (
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Asociar a tarea (opcional)</label>
          <div className="flex gap-1 flex-wrap">
            <button type="button" onClick={() => setTaskId('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!taskId ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>Ninguna</button>
            {homeTasks.map((t) => (
              <button type="button" key={t.id} onClick={() => setTaskId(t.id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${taskId === t.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{t.title}</button>
            ))}
          </div>
        </div>
      )}

      {/* Who paid */}
      <div>
        <label className="text-xs text-gray-600 mb-1 block">¿Quién pagó?</label>
        <div className="flex gap-1 flex-wrap">
          {members.map((m) => (
            <button type="button" key={m.user_id} onClick={() => setPaidBy(m.user_id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${paidBy === m.user_id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>{m.profiles?.display_name}{m.user_id === session?.user.id ? ' (yo)' : ''}</button>
          ))}
        </div>
      </div>

      {/* Split type */}
      <div>
        <label className="text-xs text-gray-600 mb-1 block">¿Cómo dividir?</label>
        <div className="flex gap-2">
          {([['equal', 'Equitativo'], ['percentage', 'Por %'], ['fixed', 'Montos fijos']] as const).map(([type, label]) => (
            <button key={type} type="button" onClick={() => setSplitType(type)} className={`rounded-full px-3 py-1 text-xs font-medium border ${splitType === type ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Participantes (se divide entre ellos):</label>
        <div className="flex flex-wrap gap-1">
          {members.map((m) => (
            <button key={m.user_id} type="button" onClick={() => toggleParticipant(m.user_id)} disabled={m.user_id === paidBy} className={`rounded-full px-3 py-1 text-xs font-medium border ${participants.includes(m.user_id) ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-300 text-gray-600'} ${m.user_id === paidBy ? 'opacity-60' : ''}`}>
              {participants.includes(m.user_id) ? '✓ ' : ''}{m.profiles?.display_name}{m.user_id === paidBy ? ' (pagó)' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Custom split amounts */}
      {splitType !== 'equal' && debtors.length > 0 && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700">{splitType === 'percentage' ? 'Porcentaje por persona (deben sumar 100%):' : 'Monto que debe cada uno:'}</p>
          {debtors.map((uid) => {
            const name = members.find((m) => m.user_id === uid)?.profiles?.display_name ?? '?'
            return (
              <div key={uid} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 w-24 truncate">{name}</span>
                <input type="number" min="0" step={splitType === 'percentage' ? '1' : '0.01'} placeholder={splitType === 'percentage' ? '%' : '$'} value={customSplits[uid] ?? ''} onChange={(e) => setCustomSplits((prev) => ({ ...prev, [uid]: e.target.value }))} className="w-24 rounded border border-gray-300 px-2 py-1 text-xs" />
                <span className="text-xs text-gray-400">{splitType === 'percentage' ? '%' : ''}</span>
              </div>
            )
          })}
          {splitType === 'percentage' && (
            <p className="text-xs text-gray-500">Total: {debtors.reduce((s, uid) => s + (parseFloat(customSplits[uid] ?? '0') || 0), 0).toFixed(1)}%</p>
          )}
        </div>
      )}

      {splitType === 'equal' && (
        <p className="text-xs text-gray-500">Cada participante paga: ${amount ? (parseFloat(amount) / participants.length).toFixed(0) : '0'} ({participants.length} personas)</p>
      )}

      {/* Receipt */}
      {!editingExpense && (
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} className="hidden" />
          <span className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50">{receiptFile ? receiptFile.name : 'Adjuntar recibo'}</span>
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Guardando...' : editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancelar</button>
      </div>
    </form>
  )
}

function BalanceView({ homeId }: { homeId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: balances, isLoading } = useQuery({
    queryKey: ['balance', homeId],
    queryFn: async () => {
      const { data: splits } = await supabase
        .from('expense_splits')
        .select('user_id, amount, expenses!inner(home_id, paid_by)')
        .eq('expenses.home_id', homeId)

      const { data: members } = await supabase
        .from('home_members')
        .select('user_id, profiles(display_name)')
        .eq('home_id', homeId)

      const { data: settlements } = await supabase
        .from('settlements')
        .select('*')
        .eq('home_id', homeId)
        .eq('confirmed', true)

      const debts: Record<string, Record<string, number>> = {}

      for (const split of splits ?? []) {
        const expense = split.expenses as unknown as { paid_by: string }
        const creditor = expense.paid_by
        const debtor = split.user_id
        const amount = Number(split.amount)
        if (!debts[debtor]) debts[debtor] = {}
        debts[debtor][creditor] = (debts[debtor][creditor] ?? 0) + amount
      }

      for (const s of settlements ?? []) {
        const fromDebts = debts[s.from_user]
        const currentDebt = fromDebts?.[s.to_user]
        if (fromDebts && currentDebt !== undefined) {
          fromDebts[s.to_user] = Math.max(0, currentDebt - Number(s.amount))
        }
      }

      const memberMap = new Map(
        (members ?? []).map((m) => [m.user_id, ((m.profiles as any)?.display_name ?? 'Desconocido') as string])
      )

      const result: MemberBalance[] = []
      for (const [userId, name] of memberMap) {
        const owes: MemberBalance['owes'] = []
        const isOwed: MemberBalance['isOwed'] = []

        if (debts[userId]) {
          for (const [creditor, amt] of Object.entries(debts[userId])) {
            if (amt > 0.01) owes.push({ toUserId: creditor, toName: memberMap.get(creditor) ?? '?', amount: Math.round(amt * 100) / 100 })
          }
        }

        for (const [debtor, creditors] of Object.entries(debts)) {
          const amt = creditors[userId]
          if (amt && amt > 0.01) isOwed.push({ fromUserId: debtor, fromName: memberMap.get(debtor) ?? '?', amount: Math.round(amt * 100) / 100 })
        }

        const totalOwed = isOwed.reduce((s, x) => s + x.amount, 0)
        const totalOwes = owes.reduce((s, x) => s + x.amount, 0)

        result.push({ userId, displayName: name, netBalance: Math.round((totalOwed - totalOwes) * 100) / 100, owes, isOwed })
      }

      return result
    },
  })

  if (isLoading) return <p className="text-gray-500">Calculando balance...</p>

  const handleSettle = async (fromUser: string, toUser: string, amount: number, toName: string) => {
    if (!(await confirm({ message: `¿Registrar pago de $${amount.toLocaleString('es-CO')} a ${toName}?`, confirmText: 'Registrar' }))) return

    const { error } = await supabase.from('settlements').insert({
      home_id: homeId, from_user: fromUser, to_user: toUser,
      amount, confirmed: true, confirmed_at: new Date().toISOString(),
    })

    if (error) toast.error(error.message)
    else {
      queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
      toast.success(`Deuda saldada: $${amount.toLocaleString('es-CO')} a ${toName}`)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Balance del Hogar</h2>

      {balances?.length === 0 && <p className="text-gray-500">No hay gastos registrados aún.</p>}

      <div className="space-y-3">
        {balances?.map((member) => (
          <div key={member.userId} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                  {member.displayName[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{member.displayName}{member.userId === session?.user.id && ' (tú)'}</span>
                  <span className={`ml-2 text-lg font-semibold ${member.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {member.netBalance >= 0 ? '+' : ''}${Math.abs(member.netBalance).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail: who they owe */}
            {member.owes.length > 0 && (
              <div className="mt-2 ml-12 space-y-1">
                {member.owes.map((debt) => (
                  <div key={debt.toUserId} className="flex items-center justify-between text-xs">
                    <span className="text-red-600">Debe ${debt.amount.toLocaleString('es-CO')} a {debt.toName}</span>
                    {member.userId === session?.user.id && (
                      <button onClick={() => handleSettle(member.userId, debt.toUserId, debt.amount, debt.toName)} className="flex items-center gap-1 rounded border border-green-400 px-2 py-0.5 text-green-700 hover:bg-green-50 transition-colors">
                        <Banknote className="h-3 w-3" /> Saldar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Detail: who owes them */}
            {member.isOwed.length > 0 && (
              <div className="mt-2 ml-12 space-y-1">
                {member.isOwed.map((credit) => (
                  <div key={credit.fromUserId} className="text-xs text-green-600">
                    {credit.fromName} le debe ${credit.amount.toLocaleString('es-CO')}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">Verde = le deben · Rojo = debe a otros</p>

      {/* Simplified settlement plan */}
      {balances && balances.some((b) => b.netBalance !== 0) && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Plan de liquidación simplificado</h3>
          <p className="text-xs text-gray-500 mb-3">Mínimas transacciones para saldar todas las deudas:</p>
          <SimplifiedSettlements balances={balances} />
        </div>
      )}
    </div>
  )
}

function SimplifiedSettlements({ balances }: { balances: MemberBalance[] }) {
  // Algorithm: minimize transactions by matching debtors with creditors
  const debtors = balances.filter((b) => b.netBalance < 0).map((b) => ({ ...b, remaining: Math.abs(b.netBalance) }))
  const creditors = balances.filter((b) => b.netBalance > 0).map((b) => ({ ...b, remaining: b.netBalance }))

  const transactions: { from: string; to: string; amount: number }[] = []

  // Greedy: match largest debtor with largest creditor
  const sortedDebtors = [...debtors].sort((a, b) => b.remaining - a.remaining)
  const sortedCreditors = [...creditors].sort((a, b) => b.remaining - a.remaining)

  for (const debtor of sortedDebtors) {
    for (const creditor of sortedCreditors) {
      if (debtor.remaining <= 0) break
      if (creditor.remaining <= 0) continue

      const amount = Math.min(debtor.remaining, creditor.remaining)
      if (amount > 0.01) {
        transactions.push({ from: debtor.displayName, to: creditor.displayName, amount: Math.round(amount * 100) / 100 })
        debtor.remaining -= amount
        creditor.remaining -= amount
      }
    }
  }

  if (transactions.length === 0) {
    return <p className="text-xs text-green-600">Todas las cuentas están saldadas</p>
  }

  return (
    <div className="space-y-1.5">
      {transactions.map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium text-red-600">{t.from}</span>
          <span className="text-gray-400">→</span>
          <span className="font-medium text-green-600">{t.to}</span>
          <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">${t.amount.toLocaleString('es-CO')}</span>
        </div>
      ))}
      <p className="text-[10px] text-gray-400 mt-2">{transactions.length} transacción{transactions.length > 1 ? 'es' : ''} para saldar todo</p>
    </div>
  )
}
