// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/supplements.schema.ts

/**
 * Supplements 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

// ============================================
// 共用的 Schema 定義
// ============================================

const supplementSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    user_id: { type: 'string' },
    name: { type: 'string' },
    dosage: { type: ['string', 'null'] },
    frequency: { type: 'string' },
    time_of_day: { type: 'string' },
    notes: { type: ['string', 'null'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
} as const;

const supplementInputSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1 },
    dosage: { type: 'string' },
    frequency: { type: 'string', default: 'daily' },
    time_of_day: { type: 'string', default: 'morning' },
    notes: { type: 'string' },
  },
} as const;

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

// ============================================
// GET /api/supplements
// ============================================
export const getSupplementsSchema = {
  description: '獲取用戶的所有補充品',
  tags: ['supplements'],
  response: {
    200: {
      type: 'array',
      items: supplementSchema,
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/supplements
// ============================================
export const createSupplementSchema = {
  description: '創建新的補充品記錄',
  tags: ['supplements'],
  body: supplementInputSchema,
  response: {
    201: supplementSchema,
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// PUT /api/supplements/:id
// ============================================
export const updateSupplementSchema = {
  description: '更新補充品記錄',
  tags: ['supplements'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
  body: supplementInputSchema,
  response: {
    200: supplementSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/supplements/:id
// ============================================
export const deleteSupplementSchema = {
  description: '刪除補充品記錄',
  tags: ['supplements'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;
