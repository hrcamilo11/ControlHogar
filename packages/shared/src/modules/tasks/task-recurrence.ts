import type { FrequencyType, FrequencyConfig } from './tasks.types'

/**
 * Calculate the next due date based on frequency type and config.
 * Called after a task is completed to set the next occurrence.
 *
 * @param frequencyType - Type of recurrence
 * @param config - Additional configuration (dayOfWeek, dayOfMonth, intervalDays, hour, minute)
 * @param fromDate - Calculate next due from this date (defaults to now)
 * @returns Next due date as ISO string, or null for one-time tasks
 */
export function calculateNextDueDate(
  frequencyType: FrequencyType,
  config: FrequencyConfig | null,
  fromDate: Date = new Date(),
): string | null {
  let result: Date | null = null

  switch (frequencyType) {
    case 'once':
      return null

    case 'daily':
      result = addDays(fromDate, 1)
      break

    case 'weekly': {
      const targetDay = config?.dayOfWeek ?? fromDate.getDay()
      result = getNextWeekday(fromDate, targetDay)
      break
    }

    case 'biweekly': {
      const days = config?.daysOfWeek
      if (days && days.length > 0) {
        // Use custom days logic but add extra week
        const nextDay = getNextCustomWeekday(fromDate, days)
        result = addDays(nextDay, 7)
      } else {
        const targetDay = config?.dayOfWeek ?? fromDate.getDay()
        const nextWeek = getNextWeekday(fromDate, targetDay)
        result = addDays(nextWeek, 7)
      }
      break
    }

    case 'monthly': {
      const targetDayOfMonth = config?.dayOfMonth ?? fromDate.getDate()
      result = getNextMonthDay(fromDate, targetDayOfMonth)
      break
    }

    case 'custom': {
      const interval = config?.intervalDays ?? 7
      result = addDays(fromDate, interval)
      break
    }

    case 'weekly_custom': {
      const days = config?.daysOfWeek ?? [1]
      result = getNextCustomWeekday(fromDate, days)
      break
    }

    default:
      return null
  }

  // Apply configured hour and minute
  if (result && config?.hour !== undefined) {
    result.setHours(config.hour, config.minute ?? 0, 0, 0)
  }

  return result?.toISOString() ?? null
}

/**
 * Calculate initial due date when creating a task.
 * For recurrent tasks, the first due date is the next occurrence from today.
 */
export function calculateInitialDueDate(
  frequencyType: FrequencyType,
  config: FrequencyConfig | null,
  explicitDueDate?: string,
): string | null {
  if (frequencyType === 'once') {
    return explicitDueDate ?? null
  }
  return calculateNextDueDate(frequencyType, config, new Date())
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getNextWeekday(from: Date, targetDay: number): Date {
  const result = new Date(from)
  const currentDay = result.getDay()
  let daysUntilTarget = targetDay - currentDay

  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7
  }

  result.setDate(result.getDate() + daysUntilTarget)
  return result
}

function getNextMonthDay(from: Date, targetDay: number): Date {
  const result = new Date(from)

  // Set to day 1 first to avoid month overflow (e.g., Jan 31 + 1 month = Mar 3)
  result.setDate(1)
  result.setMonth(result.getMonth() + 1)

  // Clamp to last day of that month if needed
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(targetDay, lastDayOfMonth))

  return result
}

/**
 * Find the next occurrence from a set of weekdays.
 * E.g., daysOfWeek=[1,3] (Mon, Wed): if today is Monday, next is Wednesday.
 * If today is Wednesday, next is Monday (next week).
 */
function getNextCustomWeekday(from: Date, daysOfWeek: number[]): Date {
  if (daysOfWeek.length === 0) return addDays(from, 1)

  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  const currentDay = from.getDay()

  // Find the next day in the list that is after today
  for (const targetDay of sorted) {
    if (targetDay > currentDay) {
      return addDays(from, targetDay - currentDay)
    }
  }

  // All target days are <= today, so wrap to next week's first target day
  const firstDay = sorted[0]!
  const daysUntilNext = 7 - currentDay + firstDay
  return addDays(from, daysUntilNext)
}
