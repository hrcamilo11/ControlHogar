import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import toast from 'react-hot-toast'
import { CreditCard, Trash2 } from 'lucide-react'

interface RecurringPayment {
  id: string
  title: string
  amount: number
  frequency: string
  due_day: number
  is_active: boolean
  created_at: string
}

export function RecurringPayments({ homeId }: { homeId: string }) {
  const [showForm, setShowForm] = useState(false)
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['recurring-payments', homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .order('due_day', { ascending: true })

      if (error) throw error
      return data as RecurringPayment[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_payments').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments', homeId] })
      toast.success('Pago eliminado')
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: async (payment: RecurringPayment) => {
      const now = new Date()
      // Create expense for this payment
      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          home_id: homeId,
          title: `${payment.title} (${now.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })})`,
          amount: payment.amount,
          paid_by: session!.user.id,
          split_type: 'equal',
          category_id: null,
        })
        .select()
        .single()

      if (expError) throw expError

      // Record payment
      const { error: recError } = await supabase.from('payment_records').insert({
        recurring_payment_id: payment.id,
        expense_id: expense.id,
        paid_by: session!.user.id,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
      })

      if (recError) throw recError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments', homeId] })
      queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
      queryClient.invalidateQueries({ queryKey: ['balance', homeId] })
      toast.success('Pago registrado como gasto')
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate') || err.message?.includes('unique') || err.message?.includes('23505')) {
        toast.error('Este pago ya fue marcado como pagado este mes')
      } else {
        toast.error(err.message)
      }
    },
  })

  if (isLoading) return <p className="text-gray-500">Cargando pagos...</p>

  const today = new Date().getDate()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Pagos Recurrentes</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          data-testid="recurring-add-button"
        >
          + Nuevo
        </button>
      </div>

      {showForm && (
        <CreateRecurringForm
          homeId={homeId}
          onCreated={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['recurring-payments', homeId] })
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {payments?.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">No hay pagos recurrentes configurados</p>
      )}

      <div className="space-y-2">
        {payments?.map((payment) => {
          const isUpcoming = payment.due_day - today <= 3 && payment.due_day - today >= 0
          const isOverdue = payment.due_day < today

          return (
            <div
              key={payment.id}
              className={`flex items-center justify-between rounded-lg border bg-white p-4 ${
                isOverdue ? 'border-red-300 bg-red-50' : isUpcoming ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{payment.title}</h4>
                  {isOverdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Vencido</span>}
                  {isUpcoming && !isOverdue && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Próximo</span>}
                </div>
                <p className="text-xs text-gray-500">
                  Vence el día {payment.due_day} · {payment.frequency} · ${Number(payment.amount).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => markPaidMutation.mutate(payment)}
                  disabled={markPaidMutation.isPending}
                  className="flex items-center gap-1 rounded-lg border border-green-400 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
                  title="Marcar como pagado este mes"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Pagado
                </button>
                <button
                  onClick={() => { if (confirm('¿Eliminar este pago recurrente?')) deleteMutation.mutate(payment.id) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreateRecurringForm({
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
  const [dueDay, setDueDay] = useState('1')
  const [frequency, setFrequency] = useState('monthly')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setIsLoading(true)

    const { error } = await supabase.from('recurring_payments').insert({
      home_id: homeId,
      title,
      amount: parseFloat(amount),
      due_day: parseInt(dueDay),
      frequency,
      split_type: 'equal',
      created_by: session.user.id,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Pago recurrente creado')
      onCreated()
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <input
        type="text"
        required
        placeholder="Nombre del pago (ej: Arriendo, Internet, Netflix)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="recurring-form-title"
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          data-testid="recurring-form-amount"
        />
        <select
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {Array.from({ length: 28 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Día {i + 1}</option>
          ))}
        </select>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="monthly">Mensual</option>
          <option value="bimonthly">Bimestral</option>
          <option value="quarterly">Trimestral</option>
          <option value="annual">Anual</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isLoading ? 'Creando...' : 'Crear'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  )
}
