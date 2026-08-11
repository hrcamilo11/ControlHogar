import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense, CreateExpenseInput, ExpenseFilters } from './finance.types'
import { calculateSplits, validateSplitConfig } from './split-calculator'
import { eventBus } from '../../events'

export class ExpensesService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createExpense(homeId: string, data: CreateExpenseInput): Promise<Expense> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    // Validate split config
    const validationError = validateSplitConfig(data.amount, data.splitConfig)
    if (validationError) throw new Error(validationError)

    const paidBy = session.session.user.id

    // Create expense
    const { data: expense, error } = await this.supabase
      .from('expenses')
      .insert({
        home_id: homeId,
        title: data.title,
        description: data.description ?? null,
        amount: data.amount,
        category_id: data.categoryId ?? null,
        paid_by: paidBy,
        split_type: data.splitConfig.type,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Calculate and insert splits
    const splits = calculateSplits(data.amount, paidBy, data.splitConfig)

    if (splits.length > 0) {
      const splitRows = splits.map((s) => ({
        expense_id: expense.id,
        user_id: s.userId,
        amount: s.amount,
        percentage: s.percentage,
      }))

      await this.supabase.from('expense_splits').insert(splitRows)
    }

    // Upload receipt if provided
    if (data.receiptFile) {
      const filePath = `${homeId}/${expense.id}.${data.receiptFile.name.split('.').pop()}`
      await this.supabase.storage.from('receipts').upload(filePath, data.receiptFile)

      const { data: urlData } = this.supabase.storage.from('receipts').getPublicUrl(filePath)
      await this.supabase
        .from('expenses')
        .update({ receipt_url: urlData.publicUrl })
        .eq('id', expense.id)
    }

    eventBus.emit('expense.created' as never, { expense: mapExpenseFromDb(expense) } as never)
    return mapExpenseFromDb(expense)
  }

  async getExpenses(filters: ExpenseFilters): Promise<Expense[]> {
    let query = this.supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('home_id', filters.homeId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 50)

    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.paidBy) query = query.eq('paid_by', filters.paidBy)
    if (filters.fromDate) query = query.gte('created_at', filters.fromDate)
    if (filters.toDate) query = query.lte('created_at', filters.toDate)
    if (filters.cursor) query = query.lt('created_at', filters.cursor)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapExpenseFromDb)
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await this.supabase.from('expenses').delete().eq('id', expenseId)
    if (error) throw new Error(error.message)
  }
}

function mapExpenseFromDb(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    homeId: row.home_id as string,
    title: row.title as string,
    description: row.description as string | null,
    amount: Number(row.amount),
    categoryId: row.category_id as string | null,
    paidBy: row.paid_by as string,
    splitType: row.split_type as Expense['splitType'],
    receiptUrl: row.receipt_url as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    splits: Array.isArray(row.expense_splits)
      ? (row.expense_splits as Record<string, unknown>[]).map((s) => ({
          id: s.id as string,
          expenseId: s.expense_id as string,
          userId: s.user_id as string,
          amount: Number(s.amount),
          percentage: s.percentage ? Number(s.percentage) : null,
        }))
      : undefined,
  }
}
