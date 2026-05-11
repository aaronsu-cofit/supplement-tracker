// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/hq.schema.ts

/**
 * HQ 路由的 JSON Schema 定義
 * 用於 Fastify 的請求驗證和 OpenAPI 文檔生成
 */

// ============================================
// 共用的 Schema 定義
// ============================================

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const;

const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
} as const;

const moduleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    is_enabled: { type: 'boolean' },
    sort_order: { type: 'integer' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
} as const;

const adminSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    display_name: { type: 'string' },
    role: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
} as const;

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: ['string', 'null'] },
    display_name: { type: ['string', 'null'] },
    line_user_id: { type: ['string', 'null'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    last_login_at: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;

// ============================================
// GET /api/hq/modules
// ============================================
export const getModulesSchema = {
  description: '獲取所有模組',
  tags: ['hq'],
  response: {
    200: {
      type: 'object',
      properties: {
        modules: {
          type: 'array',
          items: moduleSchema,
        },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// PATCH /api/hq/modules/:id
// ============================================
export const updateModuleSchema = {
  description: '更新模組',
  tags: ['hq'],
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
      title: { type: 'string' },
      description: { type: 'string' },
      is_enabled: { type: 'boolean' },
      sort_order: { type: 'integer' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        module: moduleSchema,
      },
    },
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/admins
// ============================================
export const getAdminsSchema = {
  description: '獲取所有管理員',
  tags: ['hq'],
  response: {
    200: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: adminSchema,
        },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/hq/admins
// ============================================
export const createAdminSchema = {
  description: '創建新管理員',
  tags: ['hq'],
  body: {
    type: 'object',
    required: ['email', 'password', 'displayName'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      displayName: { type: 'string', minLength: 1 },
      role: { type: 'string', enum: ['admin', 'superadmin'] },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        user: adminSchema,
      },
    },
    400: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// PATCH /api/hq/admins/:adminId
// ============================================
export const updateAdminRoleSchema = {
  description: '更新管理員角色',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['adminId'],
    properties: {
      adminId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['role'],
    properties: {
      role: { type: 'string', enum: ['admin', 'superadmin'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        user: adminSchema,
      },
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// PATCH /api/hq/me/password
// ============================================
export const updateMyPasswordSchema = {
  description: '更改自己的密碼',
  tags: ['hq'],
  body: {
    type: 'object',
    required: ['oldPassword', 'newPassword'],
    properties: {
      oldPassword: { type: 'string' },
      newPassword: { type: 'string', minLength: 6 },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users
// ============================================
export const getUsersSchema = {
  description: '獲取所有用戶',
  tags: ['hq'],
  response: {
    200: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: userSchema,
        },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId
// ============================================
export const getUserByIdSchema = {
  description: '獲取單個用戶詳情',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        user: userSchema,
      },
    },
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/engagement
// ============================================
export const getUserEngagementSchema = {
  description: '獲取用戶參與事件',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              event_type: { type: 'string' },
              event_data: { type: 'object' },
              occurred_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/attributes
// ============================================
export const getUserAttributesSchema = {
  description: '獲取用戶屬性',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        attributes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              key: { type: 'string' },
              value: { type: ['string', 'null'] },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// PUT /api/hq/users/:userId/attributes/:key
// ============================================
export const setUserAttributeSchema = {
  description: '設置用戶屬性',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId', 'key'],
    properties: {
      userId: { type: 'string' },
      key: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      value: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        attribute: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            key: { type: 'string' },
            value: { type: ['string', 'null'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/hq/users/:userId/attributes/:key
// ============================================
export const deleteUserAttributeSchema = {
  description: '刪除用戶屬性',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId', 'key'],
    properties: {
      userId: { type: 'string' },
      key: { type: 'string' },
    },
  },
  response: {
    200: successResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/missions
// ============================================
export const getUserMissionsSchema = {
  description: '獲取用戶任務',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        missions: { type: 'array' },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// POST /api/hq/users/:userId/missions
// ============================================
export const assignMissionSchema = {
  description: '分配任務給用戶',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['product_id', 'mission_key'],
    properties: {
      product_id: { type: 'string' },
      mission_key: { type: 'string' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        assignment: { type: 'object' },
      },
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/hq/users/:userId/missions/:assignmentId
// ============================================
export const abandonMissionSchema = {
  description: '放棄任務',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId', 'assignmentId'],
    properties: {
      userId: { type: 'string' },
      assignmentId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        assignment: { type: 'object' },
      },
    },
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/badges
// ============================================
export const getUserBadgesSchema = {
  description: '獲取用戶徽章',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        badges: { type: 'array' },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// DELETE /api/hq/users/:userId/badges/:templateId
// ============================================
export const removeUserBadgeSchema = {
  description: '撤銷用戶徽章',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId', 'templateId'],
    properties: {
      userId: { type: 'string' },
      templateId: { type: 'string' },
    },
  },
  response: {
    200: successResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/streaks
// ============================================
export const getUserStreaksSchema = {
  description: '獲取用戶連續記錄',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        streaks: { type: 'array' },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/journeys
// ============================================
export const getUserJourneysSchema = {
  description: '獲取用戶旅程階段',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        phases: { type: 'array' },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/users/:userId/messages
// ============================================
export const getUserMessagesSchema = {
  description: '獲取用戶消息日誌',
  tags: ['hq'],
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        messages: { type: 'array' },
      },
    },
    500: errorResponseSchema,
  },
} as const;

// ============================================
// GET /api/hq/stats
// ============================================
export const getStatsSchema = {
  description: '獲取 HQ 統計數據',
  tags: ['hq'],
  response: {
    200: {
      type: 'object',
      properties: {
        oaCount: { type: 'integer' },
        scenarioCount: { type: 'integer' },
        activeScenarioCount: { type: 'integer' },
        templateCount: { type: 'integer' },
        deployedTemplateCount: { type: 'integer' },
        recentAssignmentCount: { type: 'integer' },
        enrollmentCount: { type: 'integer' },
        recentEngagementCount: { type: 'integer' },
      },
    },
    500: errorResponseSchema,
  },
} as const;
