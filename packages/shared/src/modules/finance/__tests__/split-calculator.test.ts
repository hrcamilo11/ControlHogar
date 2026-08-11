import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateSplits, validateSplitConfig } from '../split-calculator'
import type { SplitConfig } from '../finance.types'

describe('calculateSplits', () => {
  const paidBy = 'user-payer'
  const participants = [
    { userId: 'user-payer' },
    { userId: 'user-2' },
    { userId: 'user-3' },
  ]

  describe('equal split', () => {
    it('divides equally among all participants excluding payer', () => {
      const config: SplitConfig = { type: 'equal', participants }
      const splits = calculateSplits(300, paidBy, config)

      expect(splits).toHaveLength(2) // payer excluded
      expect(splits[0].amount).toBe(100)
      expect(splits[1].amount).toBe(100)
    })

    it('returns empty if payer is only participant', () => {
      const config: SplitConfig = { type: 'equal', participants: [{ userId: paidBy }] }
      const splits = calculateSplits(100, paidBy, config)
      expect(splits).toHaveLength(0)
    })
  })

  describe('percentage split', () => {
    it('calculates amounts from percentages', () => {
      const config: SplitConfig = {
        type: 'percentage',
        participants: [
          { userId: paidBy, percentage: 50 },
          { userId: 'user-2', percentage: 30 },
          { userId: 'user-3', percentage: 20 },
        ],
      }
      const splits = calculateSplits(1000, paidBy, config)

      expect(splits).toHaveLength(2)
      expect(splits.find((s) => s.userId === 'user-2')?.amount).toBe(300)
      expect(splits.find((s) => s.userId === 'user-3')?.amount).toBe(200)
    })
  })

  describe('fixed split', () => {
    it('uses fixed amounts directly', () => {
      const config: SplitConfig = {
        type: 'fixed',
        participants: [
          { userId: paidBy, amount: 500 },
          { userId: 'user-2', amount: 300 },
          { userId: 'user-3', amount: 200 },
        ],
      }
      const splits = calculateSplits(1000, paidBy, config)

      expect(splits).toHaveLength(2)
      expect(splits.find((s) => s.userId === 'user-2')?.amount).toBe(300)
      expect(splits.find((s) => s.userId === 'user-3')?.amount).toBe(200)
    })
  })

  // Property-Based Tests
  describe('PBT: split invariants', () => {
    it('equal split: sum of debtor amounts = totalAmount * (debtors/participants)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000000 }).map((n) => n / 100),
          fc.integer({ min: 2, max: 10 }),
          (amount, participantCount) => {
            const totalAmount = Math.round(amount * 100) / 100
            const allParticipants = Array.from({ length: participantCount }, (_, i) => ({
              userId: i === 0 ? 'payer' : `user-${i}`,
            }))
            const config: SplitConfig = { type: 'equal', participants: allParticipants }
            const splits = calculateSplits(totalAmount, 'payer', config)

            // Each split should be approximately totalAmount / participantCount
            const expectedPerPerson = totalAmount / participantCount
            for (const split of splits) {
              expect(Math.abs(split.amount - expectedPerPerson)).toBeLessThan(0.02)
            }

            // Debtors = participantCount - 1 (excluding payer)
            expect(splits).toHaveLength(participantCount - 1)
          },
        ),
      )
    })

    it('all split amounts are non-negative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000000 }).map((n) => n / 100), // generates numbers like 0.01 to 100000.00
          fc.constantFrom<SplitConfig['type']>('equal', 'percentage', 'fixed'),
          (amount, splitType) => {
            const totalAmount = Math.round(amount * 100) / 100
            let config: SplitConfig

            if (splitType === 'equal') {
              config = {
                type: 'equal',
                participants: [{ userId: 'payer' }, { userId: 'u2' }, { userId: 'u3' }],
              }
            } else if (splitType === 'percentage') {
              config = {
                type: 'percentage',
                participants: [
                  { userId: 'payer', percentage: 40 },
                  { userId: 'u2', percentage: 35 },
                  { userId: 'u3', percentage: 25 },
                ],
              }
            } else {
              const half = Math.round(totalAmount / 2 * 100) / 100
              config = {
                type: 'fixed',
                participants: [
                  { userId: 'payer', amount: Math.round((totalAmount - half) * 100) / 100 },
                  { userId: 'u2', amount: half },
                ],
              }
            }

            const splits = calculateSplits(totalAmount, 'payer', config)
            for (const split of splits) {
              expect(split.amount).toBeGreaterThanOrEqual(0)
            }
          },
        ),
      )
    })

    it('payer never appears in splits', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000000 }).map((n) => n / 100),
          fc.integer({ min: 2, max: 8 }),
          (amount, count) => {
            const totalAmount = Math.round(amount * 100) / 100
            const participants = Array.from({ length: count }, (_, i) => ({
              userId: `user-${i}`,
            }))
            const payerId = 'user-0'
            const config: SplitConfig = { type: 'equal', participants }

            const splits = calculateSplits(totalAmount, payerId, config)
            expect(splits.every((s) => s.userId !== payerId)).toBe(true)
          },
        ),
      )
    })
  })
})

describe('validateSplitConfig', () => {
  it('returns null for valid equal split', () => {
    expect(validateSplitConfig(100, { type: 'equal', participants: [{ userId: 'u1' }] })).toBeNull()
  })

  it('returns error for percentage not summing to 100', () => {
    const config: SplitConfig = {
      type: 'percentage',
      participants: [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 30 },
      ],
    }
    expect(validateSplitConfig(100, config)).toContain('100%')
  })

  it('returns error for fixed not summing to total', () => {
    const config: SplitConfig = {
      type: 'fixed',
      participants: [
        { userId: 'u1', amount: 60 },
        { userId: 'u2', amount: 30 },
      ],
    }
    expect(validateSplitConfig(100, config)).toContain('total')
  })

  it('returns error for empty participants', () => {
    expect(validateSplitConfig(100, { type: 'equal', participants: [] })).toContain('participante')
  })
})
