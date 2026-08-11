import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateNextDueDate, calculateInitialDueDate } from '../task-recurrence'

describe('calculateNextDueDate', () => {
  it('returns null for once frequency', () => {
    expect(calculateNextDueDate('once', null)).toBeNull()
  })

  it('returns tomorrow for daily frequency', () => {
    const from = new Date('2026-08-10T10:00:00Z')
    const result = calculateNextDueDate('daily', null, from)
    expect(result).toBe(new Date('2026-08-11T10:00:00Z').toISOString())
  })

  it('returns next weekday for weekly frequency', () => {
    // Monday Aug 10 2026, target: Wednesday (3)
    const from = new Date('2026-08-10T10:00:00Z')
    const result = calculateNextDueDate('weekly', { dayOfWeek: 3 }, from)
    expect(new Date(result!).getDay()).toBe(3)
    expect(new Date(result!).getTime()).toBeGreaterThan(from.getTime())
  })

  it('returns next month day for monthly frequency', () => {
    const from = new Date('2026-08-15T10:00:00Z')
    const result = calculateNextDueDate('monthly', { dayOfMonth: 10 }, from)
    const resultDate = new Date(result!)
    expect(resultDate.getDate()).toBe(10)
    expect(resultDate.getMonth()).toBe(8) // September
  })

  it('clamps day to last day of month for monthly', () => {
    // Jan 31 → next month is Feb, target day 30 clamps to 28
    const from = new Date('2026-01-31T10:00:00Z')
    const result = calculateNextDueDate('monthly', { dayOfMonth: 30 }, from)
    const resultDate = new Date(result!)
    expect(resultDate.getMonth()).toBe(1) // February (0-indexed)
    expect(resultDate.getDate()).toBeLessThanOrEqual(28)
  })

  it('returns correct interval for custom frequency', () => {
    const from = new Date('2026-08-10T10:00:00Z')
    const result = calculateNextDueDate('custom', { intervalDays: 5 }, from)
    expect(result).toBe(new Date('2026-08-15T10:00:00Z').toISOString())
  })

  // Property-Based Tests (PBT)
  describe('PBT: next due date invariants', () => {
    it('daily frequency always returns a date after fromDate', () => {
      fc.assert(
        fc.property(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), (from) => {
          const result = calculateNextDueDate('daily', null, from)
          expect(result).not.toBeNull()
          expect(new Date(result!).getTime()).toBeGreaterThan(from.getTime())
        }),
      )
    })

    it('weekly frequency always returns a date within 7 days', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 0, max: 6 }),
          (from, dayOfWeek) => {
            const result = calculateNextDueDate('weekly', { dayOfWeek }, from)
            expect(result).not.toBeNull()
            const diff = new Date(result!).getTime() - from.getTime()
            const daysDiff = diff / (1000 * 60 * 60 * 24)
            expect(daysDiff).toBeGreaterThan(0)
            expect(daysDiff).toBeLessThanOrEqual(7)
          },
        ),
      )
    })

    it('custom frequency respects intervalDays exactly', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 1, max: 365 }),
          (from, intervalDays) => {
            const result = calculateNextDueDate('custom', { intervalDays }, from)
            expect(result).not.toBeNull()
            const diff = new Date(result!).getTime() - from.getTime()
            const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24))
            expect(daysDiff).toBe(intervalDays)
          },
        ),
      )
    })

    it('monthly frequency always lands on target day (or last day of month)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-11-30') }),
          fc.integer({ min: 1, max: 28 }),
          (from, dayOfMonth) => {
            const result = calculateNextDueDate('monthly', { dayOfMonth }, from)
            expect(result).not.toBeNull()
            const resultDate = new Date(result!)
            expect(resultDate.getDate()).toBeLessThanOrEqual(dayOfMonth)
            expect(resultDate.getTime()).toBeGreaterThan(from.getTime())
          },
        ),
      )
    })

    it('once frequency always returns null regardless of input', () => {
      fc.assert(
        fc.property(fc.date(), (from) => {
          expect(calculateNextDueDate('once', null, from)).toBeNull()
        }),
      )
    })
  })
})

describe('calculateInitialDueDate', () => {
  it('returns explicit date for one-time tasks', () => {
    const due = '2026-12-25T00:00:00Z'
    expect(calculateInitialDueDate('once', null, due)).toBe(due)
  })

  it('returns null for one-time tasks without explicit date', () => {
    expect(calculateInitialDueDate('once', null)).toBeNull()
  })

  it('calculates first occurrence for recurrent tasks', () => {
    const result = calculateInitialDueDate('daily', null)
    expect(result).not.toBeNull()
    expect(new Date(result!).getTime()).toBeGreaterThan(Date.now())
  })
})
