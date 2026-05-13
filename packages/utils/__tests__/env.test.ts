import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { validateEnv } from '../src/env'

describe('validateEnv', () => {
  // Save original env
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv }
  })

  it('should validate and return parsed environment variables', () => {
    process.env.PORT = '3000'
    process.env.NODE_ENV = 'development'

    const schema = z.object({
      PORT: z.coerce.number(),
      NODE_ENV: z.enum(['development', 'production', 'test']),
    })

    const result = validateEnv(schema)

    expect(result).toEqual({
      PORT: 3000,
      NODE_ENV: 'development',
    })
  })

  it('should throw error for missing required variables', () => {
    const schema = z.object({
      REQUIRED_VAR: z.string(),
    })

    expect(() => validateEnv(schema)).toThrow()
  })

  it('should throw error for invalid variable types', () => {
    process.env.PORT = 'not-a-number'

    const schema = z.object({
      PORT: z.coerce.number(),
    })

    expect(() => validateEnv(schema)).toThrow()
  })

  it('should use default values when provided', () => {
    // Clear NODE_ENV since vitest sets it to 'test'
    delete process.env.NODE_ENV

    const schema = z.object({
      PORT: z.coerce.number().default(8080),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    })

    const result = validateEnv(schema)

    expect(result.PORT).toBe(8080)
    expect(result.NODE_ENV).toBe('development')
  })

  it('should provide detailed error messages', () => {
    process.env.PORT = 'invalid'
    process.env.DATABASE_URL = ''

    const schema = z.object({
      PORT: z.coerce.number(),
      DATABASE_URL: z.string().min(1),
    })

    try {
      validateEnv(schema)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('Environment variable validation failed')
    }
  })
})
