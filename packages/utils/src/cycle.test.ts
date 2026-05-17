import { describe, it, expect, vi } from 'vitest'
import {
  getPhaseForDay,
  getPhaseDay,
  predictCycleDates,
  calculateCycleInfo,
  calculateDayInfo,
  getCalendarDateStatus,
} from './cycle'
import { createDateFromYMD, formatDate } from './date'

describe('cycle utilities', () => {
  describe('getPhaseForDay', () => {
    const cycleLen = 28
    const periodDuration = 5

    it('should identify 經期 correctly', () => {
      expect(getPhaseForDay(1, cycleLen, periodDuration)).toBe('經期')
      expect(getPhaseForDay(5, cycleLen, periodDuration)).toBe('經期')
    })

    it('should identify 易孕期 correctly (Day 9-15 per PRD)', () => {
      // In 28-day cycle, ovulation start offset is 19 -> Day 9
      // Ovulation end offset is 13 -> Day 15
      // Per PRD: 易孕期 = cyc - 19 ~ cyc - 13
      expect(getPhaseForDay(9, cycleLen, periodDuration)).toBe('易孕期')
      expect(getPhaseForDay(14, cycleLen, periodDuration)).toBe('易孕期')
      expect(getPhaseForDay(15, cycleLen, periodDuration)).toBe('易孕期')
    })

    it('should identify 黃體期 correctly (after ovulation)', () => {
      expect(getPhaseForDay(16, cycleLen, periodDuration)).toBe('黃體期')
      expect(getPhaseForDay(28, cycleLen, periodDuration)).toBe('黃體期')
    })

    it('should identify 濾泡期 correctly (Day 6-8, before ovulation)', () => {
      // 濾泡期是易孕期前的階段，第 6-8 天
      expect(getPhaseForDay(6, cycleLen, periodDuration)).toBe('濾泡期')
      expect(getPhaseForDay(8, cycleLen, periodDuration)).toBe('濾泡期')
    })
  })

  describe('getPhaseDay', () => {
    const cycleLen = 28
    const periodDuration = 5

    it('should calculate 經期 day correctly', () => {
      expect(getPhaseDay('經期', 1, cycleLen, periodDuration)).toBe(1)
      expect(getPhaseDay('經期', 5, cycleLen, periodDuration)).toBe(5)
    })

    it('should calculate 濾泡期 day correctly', () => {
      expect(getPhaseDay('濾泡期', 6, cycleLen, periodDuration)).toBe(1)
    })

    it('should calculate 易孕期 day correctly', () => {
      // Base is 19. cycleLen - 19 = 9. Day 9 is day 1.
      expect(getPhaseDay('易孕期', 9, cycleLen, periodDuration)).toBe(1)
      expect(getPhaseDay('易孕期', 14, cycleLen, periodDuration)).toBe(5) // 14 - 9 = 5
      expect(getPhaseDay('易孕期', 15, cycleLen, periodDuration)).toBe(6) // 15 - 9 = 6
    })

    it('should calculate 黃體期 day correctly', () => {
      // Base is 12. cycleLen - 12 = 16. Day 17 is day 1.
      expect(getPhaseDay('黃體期', 17, cycleLen, periodDuration)).toBe(1)
    })
  })

  describe('predictCycleDates', () => {
    it('should predict next period and ovulation dates', () => {
      const start = createDateFromYMD(2024, 5, 1)
      const result = predictCycleDates(start, 28, 5)

      // Next period should be start + 28 days -> May 29
      expect(formatDate(result.npDay)).toBe('2024-05-29')
      // Next period end should be npDay + 4 days -> June 2
      expect(formatDate(result.npEndDay)).toBe('2024-06-02')
      // Ovulation peak should be start + (28-14) = Day 15 -> May 15
      expect(formatDate(result.ovDay)).toBe('2024-05-15')
    })
  })

  describe('calculateCycleInfo', () => {
    it('should return null if no lastPeriodStart', () => {
      const data = { lastPeriodStart: null, cycleLen: 28, periodDuration: 5, dayData: {} }
      expect(
        calculateCycleInfo(
          data,
          () => 0,
          () => ''
        )
      ).toBeNull()
    })

    it('should calculate cycle stats correctly', () => {
      // Set "today" to a fixed date
      vi.useFakeTimers()
      vi.setSystemTime(createDateFromYMD(2024, 5, 10))

      const userData = {
        lastPeriodStart: { y: 2024, m: 5, d: 1 }, // Started 9 days ago
        cycleLen: 28,
        periodDuration: 5,
        dayData: {
          '2024-05-01': { pbacLogs: [{ level: 'medium', clot: 'small' }] }, // Score 5+1=6
        },
      }

      const info = calculateCycleInfo(
        userData,
        (l, c) => (l === 'medium' ? 5 : 1) + (c === 'small' ? 1 : 0),
        formatDate
      )

      expect(info).not.toBeNull()
      if (info) {
        expect(info.cycleDay).toBe(10)
        // Day 10 is now in 易孕期 (Day 9-15 per PRD)
        expect(info.phase).toBe('易孕期')
        expect(info.pbacTotal).toBe(6)
        expect(info.daysToNext).toBe(19) // 28 - 9
      }

      vi.useRealTimers()
    })

    it('should not auto-advance cycle if no new period is marked', () => {
      // Scenario: First period started on April 5, 28-day cycle
      // Today is May 17 (42 days later)
      // Predicted next period would be May 3, but no period is marked there
      // System should still use April 5 as cycle start, not auto-advance
      vi.useFakeTimers()
      vi.setSystemTime(createDateFromYMD(2026, 5, 17))

      const userData = {
        lastPeriodStart: { y: 2026, m: 4, d: 5 },
        cycleLen: 28,
        periodDuration: 5,
        dayData: {
          '2026-04-05': { period: true, pbacLogs: [] },
          '2026-04-06': { period: true, pbacLogs: [] },
          '2026-04-07': { period: true, pbacLogs: [] },
          '2026-04-08': { period: true, pbacLogs: [] },
          '2026-04-09': { period: true, pbacLogs: [] },
          // No period marked on May 3 (predicted next period start)
        },
      }

      const info = calculateCycleInfo(userData, () => 0, formatDate)

      expect(info).not.toBeNull()
      if (info) {
        // 5月17日距離4月5日 = 42天
        // 在沒有新經期標記的情況下，應該仍然在第一個週期中
        // dayInCycle = (42 % 28) + 1 = 15
        expect(info.cycleDay).toBe(15)
        // 第15天應該是易孕期
        expect(info.phase).toBe('易孕期')
        // 下次經期應該在 5月3日（距離42天的起點 28 天）
        // 5月3日距離今天(5月17日)= 14 天前 = -14 天
        expect(info.daysToNext).toBe(-14)
      }

      vi.useRealTimers()
    })

    it('should advance cycle if new period is marked', () => {
      // Scenario: First period on April 5, next period marked on May 3
      // Today is May 17 (12 days after May 3)
      // System should use May 3 as the current cycle start
      vi.useFakeTimers()
      vi.setSystemTime(createDateFromYMD(2026, 5, 17))

      const userData = {
        lastPeriodStart: { y: 2026, m: 4, d: 5 },
        cycleLen: 28,
        periodDuration: 5,
        dayData: {
          '2026-04-05': { period: true },
          '2026-04-06': { period: true },
          '2026-04-07': { period: true },
          '2026-04-08': { period: true },
          '2026-04-09': { period: true },
          '2026-05-03': { period: true }, // New period marked here
          '2026-05-04': { period: true },
          '2026-05-05': { period: true },
          '2026-05-06': { period: true },
          '2026-05-07': { period: true },
        },
      }

      const info = calculateCycleInfo(userData, () => 0, formatDate)

      expect(info).not.toBeNull()
      if (info) {
        // 5月17日距離5月3日 = 14天
        // dayInCycle = (14 % 28) + 1 = 15
        expect(info.cycleDay).toBe(15)
        // 第15天應該是易孕期
        expect(info.phase).toBe('易孕期')
        // 下次經期應該在 5月31日（5月3日 + 28天）
        // 5月31日距離今天(5月17日)= 14 天
        expect(info.daysToNext).toBe(14)
      }

      vi.useRealTimers()
    })
  })

  describe('calculateDayInfo', () => {
    it('should identify future dates', () => {
      vi.useFakeTimers()
      vi.setSystemTime(createDateFromYMD(2024, 5, 10))

      const future = createDateFromYMD(2024, 5, 15)
      const userData = { lastPeriodStart: { y: 2024, m: 5, d: 1 }, cycleLen: 28, dayData: {} }

      const info = calculateDayInfo(future, userData, null, formatDate)
      expect(info.isFuture).toBe(true)
      expect(info.statusText).toBe('未來日期')

      vi.useRealTimers()
    })
  })

  describe('predictCycleDates', () => {
    it('should calculate next period dates correctly (per PRD)', () => {
      const cycleStart = createDateFromYMD(2024, 1, 1)
      const p = predictCycleDates(cycleStart, 28, 5)

      // Per PRD: 排卵日 = 基準 + 14 天 = 2024-1-15
      expect(formatDate(p.ovDay)).toBe('2024-01-15')

      // Per PRD: 易孕期開始 = 基準 + 9 天 = 2024-1-10
      expect(formatDate(p.fsDay)).toBe('2024-01-10')

      // Per PRD: 易孕期結束 = 基準 + 15 天 = 2024-1-16
      expect(formatDate(p.feDay)).toBe('2024-01-16')

      // Per PRD: 下次經期開始 = 基準 + 28 天 = 2024-1-29
      expect(formatDate(p.npDay)).toBe('2024-01-29')

      // 經期結束 = 開始 + 4 天 = 2024-2-2
      expect(formatDate(p.npEndDay)).toBe('2024-02-02')
    })
  })

  describe('getCalendarDateStatus', () => {
    it('should return ovulation-day for predicted ovulation date (per PRD formula)', () => {
      const lastPeriodStart = { y: 2024, m: 1, d: 1 }
      const cycleLen = 28
      const periodDuration = 5

      // Per PRD: 排卵日 = 基準日期 + (週期長度 - 14) 天 = 2024-1-1 + 14 days = 2024-1-15
      const ovulationDate = createDateFromYMD(2024, 1, 15)
      const status = getCalendarDateStatus(
        ovulationDate,
        lastPeriodStart,
        cycleLen,
        periodDuration,
        {},
        formatDate
      )
      expect(status).toBe(' ovulation-day')
    })

    it('should return ovulation-period for fertile window (per PRD formula)', () => {
      const lastPeriodStart = { y: 2024, m: 1, d: 1 }
      const cycleLen = 28
      const periodDuration = 5

      // Per PRD: 易孕期開始 = 基準 + (週期長 - 19) 天 = 2024-1-1 + 9 days = 2024-1-10
      const fertileStart = createDateFromYMD(2024, 1, 10)
      const status1 = getCalendarDateStatus(
        fertileStart,
        lastPeriodStart,
        cycleLen,
        periodDuration,
        {},
        formatDate
      )
      expect(status1).toBe(' ovulation-period')

      // Per PRD: 易孕期結束 = 基準 + (週期長 - 13) 天 = 2024-1-1 + 15 days = 2024-1-16
      const fertileEnd = createDateFromYMD(2024, 1, 16)
      const status2 = getCalendarDateStatus(
        fertileEnd,
        lastPeriodStart,
        cycleLen,
        periodDuration,
        {},
        formatDate
      )
      expect(status2).toBe(' ovulation-period')
    })

    it('should return pred for first day of predicted menstrual period only', () => {
      const lastPeriodStart = { y: 2024, m: 1, d: 1 }
      const cycleLen = 28
      const periodDuration = 5

      // Predicted next period starts at day 28: 2024-1-1 + 28 days = 2024-1-29
      const predictedPeriodStart = createDateFromYMD(2024, 1, 29)
      const status1 = getCalendarDateStatus(
        predictedPeriodStart,
        lastPeriodStart,
        cycleLen,
        periodDuration,
        {},
        formatDate
      )
      expect(status1).toBe(' pred')

      // Other days of predicted period should return empty string
      const predictedPeriodEnd = createDateFromYMD(2024, 2, 2)
      const status2 = getCalendarDateStatus(
        predictedPeriodEnd,
        lastPeriodStart,
        cycleLen,
        periodDuration,
        {},
        formatDate
      )
      expect(status2).toBe('')

      // Middle of predicted period
      const predictedPeriodMiddle = createDateFromYMD(2024, 1, 31)
      const status3 = getCalendarDateStatus(
        predictedPeriodMiddle,
        lastPeriodStart,
        cycleLen,
        periodDuration,
        {},
        formatDate
      )
      expect(status3).toBe('')
    })
  })
})
