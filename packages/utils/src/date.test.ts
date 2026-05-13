import { describe, it, expect } from 'vitest'
import {
  createDateFromYMD,
  daysDifference,
  addDaysToDate,
  getDateOnly,
  formatDate,
  dk,
} from './date'

describe('date utilities', () => {
  it('should create date from YMD', () => {
    const date = createDateFromYMD(2024, 5, 20)
    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(4) // 0-based
    expect(date.getDate()).toBe(20)
  })

  it('should calculate days difference correctly', () => {
    const d1 = createDateFromYMD(2024, 5, 20)
    const d2 = createDateFromYMD(2024, 5, 15)
    expect(daysDifference(d1, d2)).toBe(5)
    expect(daysDifference(d2, d1)).toBe(-5)
  })

  it('should add days to date', () => {
    const start = createDateFromYMD(2024, 5, 20)
    const result = addDaysToDate(start, 5)
    expect(result.getDate()).toBe(25)

    const subtract = addDaysToDate(start, -5)
    expect(subtract.getDate()).toBe(15)
  })

  it('should handle month rollover when adding days', () => {
    const start = createDateFromYMD(2024, 5, 31)
    const result = addDaysToDate(start, 1)
    expect(result.getMonth()).toBe(5) // June
    expect(result.getDate()).toBe(1)
  })

  it('should get integer days (getDateOnly)', () => {
    const date = new Date(2024, 4, 20, 10, 30, 0)
    const dayValue = getDateOnly(date)
    expect(Number.isInteger(dayValue)).toBe(true)

    const anotherTimeSameDay = new Date(2024, 4, 20, 23, 59, 59)
    expect(getDateOnly(anotherTimeSameDay)).toBe(dayValue)
  })

  it('should format date correctly using dk and formatDate', () => {
    expect(dk(2024, 5, 20)).toBe('2024-05-20')

    const date = createDateFromYMD(2024, 5, 20)
    expect(formatDate(date)).toBe('2024-05-20')
  })
})
