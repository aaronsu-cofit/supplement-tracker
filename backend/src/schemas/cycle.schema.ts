/**
 * Cycle 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證
 */

const errorObjectSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const

const cycleDataSchema = {
  type: 'object',
  properties: {
    hasData: { type: 'boolean' },
    lastPeriodStart: {
      oneOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: {
            y: { type: 'number' },
            m: { type: 'number' },
            d: { type: 'number' },
          },
        },
      ],
    },
    periodDuration: { type: 'number' },
    cycleLen: { type: 'number' },
    dayData: {
      type: 'object',
      additionalProperties: true,
    },
  },
} as const

const dailyLogSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    date: { type: 'string' },
    data: { type: 'object', additionalProperties: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const

// ============================================
// GET /api/cycle/user - Get user cycle data
// ============================================
export const getUserCycleDataSchema = {
  response: {
    200: cycleDataSchema,
    401: errorObjectSchema,
    500: errorObjectSchema,
  },
} as const

// ============================================
// POST /api/cycle/setup - Setup cycle tracking
// ============================================
export const setupCycleSchema = {
  body: {
    type: 'object',
    required: ['lastPeriodStart', 'periodDuration', 'cycleLen'],
    properties: {
      lastPeriodStart: {
        type: 'object',
        required: ['y', 'm', 'd'],
        properties: {
          y: { type: 'number', description: 'Year' },
          m: { type: 'number', description: 'Month (1-12)' },
          d: { type: 'number', description: 'Day (1-31)' },
        },
      },
      periodDuration: {
        type: 'number',
        minimum: 1,
        description: 'Period duration in days',
      },
      cycleLen: {
        type: 'number',
        minimum: 1,
        description: 'Menstrual cycle length in days',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    400: errorObjectSchema,
    401: errorObjectSchema,
  },
} as const

// ============================================
// POST /api/cycle/log - Save daily log
// ============================================
export const saveDailyLogSchema = {
  body: {
    type: 'object',
    required: ['date', 'data'],
    properties: {
      date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      data: { type: 'object', additionalProperties: true, description: 'Daily log data' },
    },
  },
  response: {
    200: dailyLogSchema,
    400: errorObjectSchema,
    401: errorObjectSchema,
  },
} as const

// ============================================
// PATCH /api/cycle/settings - Update cycle settings
// ============================================
export const updateCycleSettingsSchema = {
  body: {
    type: 'object',
    required: ['periodDuration', 'cycleLen'],
    properties: {
      periodDuration: {
        type: 'number',
        minimum: 1,
        description: 'Period duration in days',
      },
      cycleLen: {
        type: 'number',
        minimum: 1,
        description: 'Menstrual cycle length in days',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    400: errorObjectSchema,
    401: errorObjectSchema,
  },
} as const
