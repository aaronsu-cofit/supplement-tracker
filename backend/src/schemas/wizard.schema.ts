// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/wizard.schema.ts

/**
 * Wizard 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

// ============================================
// GET /api/wizard/oa/:oaId/scenarios
// ============================================
export const getScenariosSchema = {
  description: '獲取 OA 的所有場景',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['oaId'],
    properties: {
      oaId: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        scenarios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              oa_id: { type: 'integer' },
              name: { type: 'string' },
              flow_nodes: {},
              flow_edges: {},
              is_active: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    400: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/wizard/oa/:oaId/scenarios
// ============================================
export const createScenarioSchema = {
  description: '創建新場景',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['oaId'],
    properties: {
      oaId: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      flow_nodes: {},
      flow_edges: {},
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        scenario: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            oa_id: { type: 'integer' },
            name: { type: 'string' },
            flow_nodes: {},
            flow_edges: {},
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      },
    },
    400: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/wizard/scenarios/:id
// ============================================
export const getScenarioSchema = {
  description: '獲取單個場景',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        scenario: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            oa_id: { type: 'integer' },
            name: { type: 'string' },
            flow_nodes: {},
            flow_edges: {},
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      },
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================
// PATCH /api/wizard/scenarios/:id
// ============================================
export const updateScenarioSchema = {
  description: '更新場景',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      flow_nodes: {},
      flow_edges: {},
      is_active: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        scenario: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            oa_id: { type: 'integer' },
            name: { type: 'string' },
            flow_nodes: {},
            flow_edges: {},
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      },
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/wizard/scenarios/:id
// ============================================
export const deleteScenarioSchema = {
  description: '刪除場景',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/wizard/scenarios/:id/enroll-all
// ============================================
export const enrollAllUsersSchema = {
  description: '批量註冊所有 LINE 用戶到場景',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        enrolled: { type: 'number' },
      },
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/wizard/enrollments/:id
// ============================================
export const deleteEnrollmentSchema = {
  description: '刪除單個註冊',
  tags: ['wizard'],
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
  },
} as const;

// ============================================
// DELETE /api/wizard/scenarios/:id/enrollments
// ============================================
export const deleteAllEnrollmentsSchema = {
  description: '刪除場景的所有註冊',
  tags: ['wizard'],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        deleted: { type: 'number' },
      },
    },
  },
} as const;
