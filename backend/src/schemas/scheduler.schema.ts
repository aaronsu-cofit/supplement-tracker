// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/scheduler.schema.ts

/**
 * Scheduler 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    details: { type: 'string' },
  },
} as const;

// ============================================
// POST /api/scheduler/run
// ============================================
export const runSchedulerSchema = {
  description: '執行每日調度週期',
  tags: ['scheduler'],
  querystring: {
    type: 'object',
    properties: {
      skip_menu_reeval: { type: 'string', enum: ['1'] },
    },
  },
  response: {
    200: { type: 'object', additionalProperties: true },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/scheduler/activity
// ============================================
export const getSchedulerActivitySchema = {
  description: '獲取調度器活動數據',
  tags: ['scheduler'],
  querystring: {
    type: 'object',
    properties: {
      oa_id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        enrollments: { type: 'array', items: { type: 'object', additionalProperties: true } },
        deliveries: { type: 'array', items: { type: 'object', additionalProperties: true } },
        engagement: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              user_id: { type: 'string' },
              event_type: { type: 'string' },
              payload: { type: ['string', 'null'] },
              occurred_at: { type: 'string', format: 'date-time' },
            },
            additionalProperties: true,
          },
        },
        oaId: { type: ['number', 'null'] },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/scheduler/dry-run
// ============================================
export const schedulerDryRunSchema = {
  description: '執行調度器乾跑（不產生副作用）',
  tags: ['scheduler'],
  body: {
    type: 'object',
    required: ['user_id'],
    properties: {
      user_id: { type: 'string', minLength: 1 },
      scenario_id: { type: 'string' },
      as_of: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    200: { type: 'object', additionalProperties: true },
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;
