import type { SplitConfig, ExpenseSplit } from './finance.types'

/**
 * Calculate how an expense should be split among participants.
 * Pure function — no side effects, easily testable with PBT.
 *
 * @param totalAmount - Total expense amount
 * @param paidBy - User who paid (excluded from splits — they are the creditor)
 * @param config - Split configuration (type + participants)
 * @returns Array of splits (userId + amount each person owes)
 *
 * Invariants:
 * - Sum of all split amounts = totalAmount (minus payer's share if payer is a participant)
 * - Each split amount >= 0
 * - No split for the payer (they already paid)
 */
export function calculateSplits(
  totalAmount: number,
  paidBy: string,
  config: SplitConfig,
): Omit<ExpenseSplit, 'id' | 'expenseId'>[] {
  // Filter out the payer from participants (payer doesn't owe themselves)
  const debtors = config.participants.filter((p) => p.userId !== paidBy)

  if (debtors.length === 0) {
    return []
  }

  switch (config.type) {
    case 'equal':
      return calculateEqualSplit(totalAmount, paidBy, config)

    case 'percentage':
      return calculatePercentageSplit(totalAmount, paidBy, config)

    case 'fixed':
      return calculateFixedSplit(paidBy, config)

    default:
      return []
  }
}

function calculateEqualSplit(
  totalAmount: number,
  paidBy: string,
  config: SplitConfig,
): Omit<ExpenseSplit, 'id' | 'expenseId'>[] {
  const allParticipants = config.participants
  const sharePerPerson = totalAmount / allParticipants.length

  // Only debtors (not the payer) get a split entry
  return allParticipants
    .filter((p) => p.userId !== paidBy)
    .map((p) => ({
      userId: p.userId,
      amount: roundToTwoDecimals(sharePerPerson),
      percentage: roundToTwoDecimals(100 / allParticipants.length),
    }))
}

function calculatePercentageSplit(
  totalAmount: number,
  paidBy: string,
  config: SplitConfig,
): Omit<ExpenseSplit, 'id' | 'expenseId'>[] {
  return config.participants
    .filter((p) => p.userId !== paidBy)
    .map((p) => ({
      userId: p.userId,
      amount: roundToTwoDecimals(totalAmount * (p.percentage ?? 0) / 100),
      percentage: p.percentage ?? null,
    }))
}

function calculateFixedSplit(
  paidBy: string,
  config: SplitConfig,
): Omit<ExpenseSplit, 'id' | 'expenseId'>[] {
  return config.participants
    .filter((p) => p.userId !== paidBy)
    .map((p) => ({
      userId: p.userId,
      amount: roundToTwoDecimals(p.amount ?? 0),
      percentage: null,
    }))
}

/**
 * Validate that a split configuration is consistent.
 * @returns Error message or null if valid
 */
export function validateSplitConfig(
  totalAmount: number,
  config: SplitConfig,
): string | null {
  if (config.participants.length === 0) {
    return 'Debe haber al menos un participante'
  }

  switch (config.type) {
    case 'equal':
      return null // Always valid

    case 'percentage': {
      const totalPercentage = config.participants.reduce((sum, p) => sum + (p.percentage ?? 0), 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return `Los porcentajes deben sumar 100% (actual: ${totalPercentage}%)`
      }
      return null
    }

    case 'fixed': {
      const totalFixed = config.participants.reduce((sum, p) => sum + (p.amount ?? 0), 0)
      if (Math.abs(totalFixed - totalAmount) > 0.01) {
        return `Los montos fijos deben sumar el total del gasto (${totalAmount}), actual: ${totalFixed}`
      }
      return null
    }

    default:
      return 'Tipo de split inválido'
  }
}

function roundToTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100
}
