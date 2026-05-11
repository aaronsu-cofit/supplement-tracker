// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/intimacy.schema.ts

/**
 * Intimacy 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

// ============================================
// GET /api/intimacy/assessments
// ============================================
export const getIntimacyAssessmentsSchema = {
  description: '獲取用戶的親密關係評估列表',
  tags: ['intimacy'],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        assessments: { type: 'array', items: { type: 'object' } },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/intimacy/assessments
// ============================================
export const createIntimacyAssessmentSchema = {
  description: '創建新的親密關係評估',
  tags: ['intimacy'],
  body: {
    type: 'object',
    additionalProperties: true,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        assessment: { type: 'object' },
      },
    },
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;
