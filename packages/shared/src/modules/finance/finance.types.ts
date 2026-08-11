export type SplitType = 'equal' | 'percentage' | 'fixed'

export interface SplitConfig {
  type: SplitType
  participants: SplitParticipant[]
}

export interface SplitParticipant {
  userId: string
  percentage?: number // for 'percentage' type (must sum to 100)
  amount?: number // for 'fixed' type (must sum to total)
}

export interface Expense {
  id: string
  homeId: string
  title: string
  description: string | null
  amount: number
  categoryId: string | null
  paidBy: string
  splitType: SplitType
  receiptUrl: string | null
  createdAt: string
  updatedAt: string
  splits?: ExpenseSplit[]
}

export interface ExpenseSplit {
  id: string
  expenseId: string
  userId: string
  amount: number
  percentage: number | null
}

export interface RecurringPayment {
  id: string
  homeId: string
  title: string
  amount: number
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'annual'
  dueDay: number
  categoryId: string | null
  splitType: SplitType
  splitConfig: SplitConfig | null
  notifyDaysBefore: number
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Settlement {
  id: string
  homeId: string
  fromUser: string
  toUser: string
  amount: number
  confirmed: boolean
  confirmedAt: string | null
  createdAt: string
}

export interface Budget {
  id: string
  homeId: string
  categoryId: string
  amount: number
  month: number
  year: number
  createdBy: string
  createdAt: string
}

export interface BudgetStatus {
  budget: Budget
  spent: number
  percentage: number
  isOverBudget: boolean
}

export interface ShoppingItem {
  id: string
  homeId: string
  name: string
  quantity: string | null
  isBought: boolean
  boughtBy: string | null
  boughtAt: string | null
  expenseId: string | null
  addedBy: string
  createdAt: string
}

export interface MemberBalance {
  userId: string
  displayName: string
  netBalance: number // positive = others owe them, negative = they owe others
  owes: { toUserId: string; amount: number }[]
  isOwed: { fromUserId: string; amount: number }[]
}

export interface CreateExpenseInput {
  title: string
  description?: string
  amount: number
  categoryId?: string
  splitConfig: SplitConfig
  receiptFile?: File
}

export interface ExpenseFilters {
  homeId: string
  categoryId?: string
  paidBy?: string
  fromDate?: string
  toDate?: string
  limit?: number
  cursor?: string
}
