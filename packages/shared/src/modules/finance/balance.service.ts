import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemberBalance, Settlement } from './finance.types'

/**
 * BalanceService calculates net balances between home members.
 * Balance = what others owe me (from my expenses) - what I owe others (from their expenses)
 * Settlements reduce outstanding balances.
 */
export class BalanceService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getBalance(homeId: string): Promise<MemberBalance[]> {
    // Get all expense splits for this home
    const { data: splits, error: splitsError } = await this.supabase
      .from('expense_splits')
      .select('*, expenses!inner(home_id, paid_by)')
      .eq('expenses.home_id', homeId)

    if (splitsError) throw new Error(splitsError.message)

    // Get confirmed settlements
    const { data: settlements, error: settlementsError } = await this.supabase
      .from('settlements')
      .select()
      .eq('home_id', homeId)
      .eq('confirmed', true)

    if (settlementsError) throw new Error(settlementsError.message)

    // Get members for display names
    const { data: members } = await this.supabase
      .from('home_members')
      .select('user_id, profiles(display_name)')
      .eq('home_id', homeId)

    // Build debt graph: debts[debtor][creditor] = amount
    const debts: Record<string, Record<string, number>> = {}

    for (const split of splits ?? []) {
      const expense = split.expenses as Record<string, unknown>
      const creditor = expense.paid_by as string
      const debtor = split.user_id as string
      const amount = split.amount as number

      if (!debts[debtor]) debts[debtor] = {}
      debts[debtor][creditor] = (debts[debtor][creditor] ?? 0) + amount
    }

    // Subtract settlements
    for (const settlement of settlements ?? []) {
      const fromUser = settlement.from_user as string
      const toUser = settlement.to_user as string
      const amount = settlement.amount as number

      if (debts[fromUser]?.[toUser]) {
        debts[fromUser][toUser] = Math.max(0, debts[fromUser][toUser] - amount)
      }
    }

    // Build member balances
    const memberMap = new Map(
      (members ?? []).map((m) => [
        m.user_id as string,
        ((m.profiles as unknown as Record<string, unknown>)?.display_name as string) ?? 'Unknown',
      ]),
    )

    const balances: MemberBalance[] = []
    const allUserIds = new Set([
      ...Object.keys(debts),
      ...Object.values(debts).flatMap((d) => Object.keys(d)),
    ])

    for (const userId of allUserIds) {
      const owes: { toUserId: string; amount: number }[] = []
      const isOwed: { fromUserId: string; amount: number }[] = []

      // What this user owes others
      if (debts[userId]) {
        for (const [creditor, amount] of Object.entries(debts[userId])) {
          if (amount > 0.01) {
            owes.push({ toUserId: creditor, amount: Math.round(amount * 100) / 100 })
          }
        }
      }

      // What others owe this user
      for (const [debtor, creditors] of Object.entries(debts)) {
        if (creditors[userId] && creditors[userId] > 0.01) {
          isOwed.push({ fromUserId: debtor, amount: Math.round(creditors[userId] * 100) / 100 })
        }
      }

      const totalOwed = isOwed.reduce((sum, x) => sum + x.amount, 0)
      const totalOwes = owes.reduce((sum, x) => sum + x.amount, 0)

      balances.push({
        userId,
        displayName: memberMap.get(userId) ?? 'Unknown',
        netBalance: Math.round((totalOwed - totalOwes) * 100) / 100,
        owes,
        isOwed,
      })
    }

    return balances
  }

  async createSettlement(
    homeId: string,
    fromUser: string,
    toUser: string,
    amount: number,
  ): Promise<Settlement> {
    const { data, error } = await this.supabase
      .from('settlements')
      .insert({
        home_id: homeId,
        from_user: fromUser,
        to_user: toUser,
        amount,
        confirmed: false,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: data.id,
      homeId: data.home_id,
      fromUser: data.from_user,
      toUser: data.to_user,
      amount: data.amount,
      confirmed: data.confirmed,
      confirmedAt: data.confirmed_at,
      createdAt: data.created_at,
    }
  }

  async confirmSettlement(settlementId: string): Promise<void> {
    const { error } = await this.supabase
      .from('settlements')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', settlementId)

    if (error) throw new Error(error.message)
  }
}
