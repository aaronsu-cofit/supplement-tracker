// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/wounds.schema.ts

/**
 * Wounds 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

// ============================================
// 共用的 Schema 定義
// ============================================

const woundSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    user_id: { type: 'string' },
    name: { type: 'string' },
    location: { type: ['string', 'null'] },
    date_of_injury: { type: 'string', format: 'date-time' },
    display_name: { type: ['string', 'null'] },
    picture_url: { type: ['string', 'null'] },
    wound_type: { type: ['string', 'null'] },
    body_location: { type: ['string', 'null'] },
    status: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
} as const;

const createWoundInputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    location: { type: 'string' },
    date_of_injury: { type: 'string', format: 'date' },
    display_name: { type: 'string' },
    picture_url: { type: 'string' },
    wound_type: { type: 'string' },
    body_location: { type: 'string' },
  },
} as const;

const updateWoundInputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    wound_type: { type: 'string' },
    body_location: { type: 'string' },
    date_of_injury: { type: 'string', format: 'date' },
  },
} as const;

const woundLogSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    user_id: { type: 'string' },
    wound_id: { type: 'integer' },
    image_data: { type: ['string', 'null'] },
    nrs_pain_score: { type: 'integer' },
    symptoms: { type: ['string', 'null'] },
    ai_assessment_summary: { type: ['string', 'null'] },
    ai_status_label: { type: ['string', 'null'] },
    logged_at: { type: 'string', format: 'date-time' },
  },
} as const;

const createWoundLogInputSchema = {
  type: 'object',
  properties: {
    image_data: { type: 'string' },
    nrs_pain_score: { type: 'integer', minimum: 0, maximum: 10 },
    symptoms: { type: 'string' },
    ai_assessment_summary: { type: 'string' },
    ai_status_label: { type: 'string' },
  },
} as const;

const woundIdParamSchema = {
  type: 'object',
  required: ['woundId'],
  properties: {
    woundId: { type: 'string', pattern: '^[0-9]+$' },
  },
} as const;

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
} as const;

// ============================================
// GET /api/wounds
// ============================================
export const getWoundsSchema = {
  description: '獲取用戶的所有活躍傷口',
  tags: ['wounds'],
  response: {
    200: {
      type: 'array',
      items: woundSchema,
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/wounds/:woundId
// ============================================
export const getWoundByIdSchema = {
  description: '獲取單個傷口詳情',
  tags: ['wounds'],
  params: woundIdParamSchema,
  response: {
    200: woundSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/wounds
// ============================================
export const createWoundSchema = {
  description: '創建新的傷口記錄',
  tags: ['wounds'],
  body: createWoundInputSchema,
  response: {
    201: woundSchema,
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// PATCH /api/wounds/:woundId
// ============================================
export const updateWoundSchema = {
  description: '更新傷口記錄',
  tags: ['wounds'],
  params: woundIdParamSchema,
  body: updateWoundInputSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        wound: woundSchema,
      },
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/wounds/:woundId
// ============================================
export const deleteWoundSchema = {
  description: '歸檔（軟刪除）傷口記錄',
  tags: ['wounds'],
  params: woundIdParamSchema,
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/wounds/admin
// ============================================
export const getAllWoundsAdminSchema = {
  description: '管理員獲取所有傷口（最近 50 個）',
  tags: ['wounds', 'admin'],
  response: {
    200: {
      type: 'array',
      items: woundSchema,
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/wounds/:woundId/logs
// ============================================
export const getWoundLogsSchema = {
  description: '獲取傷口的所有日誌記錄',
  tags: ['wounds', 'logs'],
  params: woundIdParamSchema,
  response: {
    200: {
      type: 'array',
      items: woundLogSchema,
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/wounds/:woundId/logs
// ============================================
export const createWoundLogSchema = {
  description: '創建傷口日誌記錄',
  tags: ['wounds', 'logs'],
  params: woundIdParamSchema,
  body: createWoundLogInputSchema,
  response: {
    201: woundLogSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/wounds/:woundId/soap
// ============================================
export const generateSoapNoteSchema = {
  description: '生成 SOAP Note（護理紀錄）',
  tags: ['wounds', 'ai'],
  params: woundIdParamSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        soap_note: { type: 'string' },
      },
    },
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;
