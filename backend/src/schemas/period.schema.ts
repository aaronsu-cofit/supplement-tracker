/**
 * Period 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證
 */

const periodObjectSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: ['string', 'null'], format: 'date-time' },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const

const errorObjectSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const

// ============================================
// POST /api/periods - Create period
// ============================================
export const createPeriodSchema = {
  body: {
    type: 'object',
    required: ['startDate'],
    properties: {
      startDate: { type: 'string', description: 'Period start date in ISO 8601 format' },
      endDate: { type: ['string', 'null'], description: 'Period end date in ISO 8601 format' },
      notes: { type: ['string', 'null'], maxLength: 1000, description: 'Optional notes' },
    },
  },
  response: {
    201: periodObjectSchema,
    400: errorObjectSchema,
    401: errorObjectSchema,
  },
} as const

// ============================================
// GET /api/periods - List periods
// ============================================
export const listPeriodSchema = {
  querystring: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Filter by periods starting after this date',
      },
      endDate: {
        type: 'string',
        description: 'Filter by periods ending before this date',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Maximum number of results',
      },
      offset: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip',
      },
    },
  },
  response: {
    200: {
      type: 'array',
      items: periodObjectSchema,
    },
    401: errorObjectSchema,
    500: errorObjectSchema,
  },
} as const

// ============================================
// Type Exports
// ============================================

export type CreatePeriodRequest = {
  startDate: string
  endDate?: string
  notes?: string
}

export type PeriodQuery = {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}
