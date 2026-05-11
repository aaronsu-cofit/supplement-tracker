// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/ai.schema.ts

/**
 * AI 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

const aiRequestBodySchema = {
  type: 'object',
  required: ['agent_id'],
  properties: {
    agent_id: { type: 'string', minLength: 1 },
  },
} as const;

// ============================================
// POST /api/ai/run
// ============================================
export const runAISchema = {
  description: '同步執行 AI Skill（LINE 聊天室用）',
  tags: ['ai'],
  body: aiRequestBodySchema,
  response: {
    200: { type: 'object', additionalProperties: true },
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/ai/stream
// ============================================
export const streamAISchema = {
  description: 'SSE 串流執行 AI Skill（LIFF 用）',
  tags: ['ai'],
  body: aiRequestBodySchema,
  response: {
    // SSE 串流不需要 JSON schema 驗證
    502: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;
