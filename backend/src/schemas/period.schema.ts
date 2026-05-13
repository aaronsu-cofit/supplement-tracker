import { Type, Static } from '@sinclair/typebox'

/**
 * Request/Response schemas for Period endpoints
 */

// Request schemas
export const CreatePeriodSchema = Type.Object({
  startDate: Type.String({ description: 'Period start date in ISO 8601 format' }),
  endDate: Type.Optional(Type.String({ description: 'Period end date in ISO 8601 format' })),
  notes: Type.Optional(Type.String({ maxLength: 1000, description: 'Optional notes' })),
})

export const PeriodQuerySchema = Type.Object({
  startDate: Type.Optional(
    Type.String({ description: 'Filter by periods starting after this date' })
  ),
  endDate: Type.Optional(Type.String({ description: 'Filter by periods ending before this date' })),
  limit: Type.Optional(
    Type.Number({ minimum: 1, maximum: 100, default: 50, description: 'Maximum number of results' })
  ),
  offset: Type.Optional(
    Type.Number({ minimum: 0, default: 0, description: 'Number of results to skip' })
  ),
})

// Response schemas
export const PeriodResponseSchema = Type.Object({
  id: Type.String(),
  clientId: Type.String(),
  startDate: Type.String({ format: 'date-time' }),
  endDate: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  notes: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})

export const PeriodListResponseSchema = Type.Array(PeriodResponseSchema)

// Error response schema
export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
})

// TypeScript types
export type CreatePeriodRequest = Static<typeof CreatePeriodSchema>
export type PeriodQuery = Static<typeof PeriodQuerySchema>
export type PeriodResponse = Static<typeof PeriodResponseSchema>
export type ErrorResponse = Static<typeof ErrorResponseSchema>
