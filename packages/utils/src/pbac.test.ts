import { describe, it, expect } from 'vitest'
import { getScore, hasPeriodRecords } from './pbac'

describe('PBAC utilities', () => {
  describe('getScore', () => {
    it('should calculate base score for light level', () => {
      expect(getScore('light', 'none')).toBe(1)
    })

    it('should calculate base score for medium level', () => {
      expect(getScore('medium', 'none')).toBe(5)
    })

    it('should calculate base score for heavy level', () => {
      expect(getScore('heavy', 'none')).toBe(20)
    })

    it('should add clot score correctly', () => {
      // small clot is 1 point
      expect(getScore('medium', 'small')).toBe(6)
      // large clot is 5 points
      expect(getScore('heavy', 'large')).toBe(25)
    })

    it('should handle undefined or missing clot', () => {
      expect(getScore('light', undefined)).toBe(1)
      expect(getScore('medium', 'unknown_id')).toBe(5)
    })
  })

  describe('hasPeriodRecords', () => {
    it('should return false for empty or undefined data', () => {
      expect(hasPeriodRecords(null)).toBe(false)
      expect(hasPeriodRecords(undefined)).toBe(false)
      expect(hasPeriodRecords({})).toBe(false)
    })

    it('should return true if pbacLogs exist', () => {
      expect(hasPeriodRecords({ pbacLogs: [{ level: 'light' }] })).toBe(true)
    })

    it('should return true if symptoms exist', () => {
      expect(hasPeriodRecords({ symptoms: ['腹痛'] })).toBe(true)
    })

    it('should return true if emotions exist', () => {
      expect(hasPeriodRecords({ emotions: ['開心'] })).toBe(true)
    })

    it('should return true if specific properties exist', () => {
      expect(hasPeriodRecords({ bloodColor: 'red' })).toBe(true)
      expect(hasPeriodRecords({ clot: 'small' })).toBe(true)
      expect(hasPeriodRecords({ pbacProduct: 'pad' })).toBe(true)
    })
  })
})
