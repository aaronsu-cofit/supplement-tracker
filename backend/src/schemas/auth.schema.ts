// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/auth.schema.ts
/**
 * Fastify JSON Schema 定義
 * 用於：
 * - 請求體驗證
 * - 響應序列化
 * - OpenAPI/Swagger 文檔生成
 */

/**
 * 用戶登入請求 Schema
 */
export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: '用戶電子郵件',
      },
      password: {
        type: 'string',
        minLength: 1,
        description: '用戶密碼',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            authProvider: { type: 'string' },
            role: { type: 'string' },
            userType: { type: 'string', enum: ['user', 'admin'] },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

/**
 * 用戶註冊請求 Schema
 */
export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: '用戶電子郵件',
      },
      password: {
        type: 'string',
        minLength: 6,
        description: '用戶密碼（至少 6 個字符）',
      },
      displayName: {
        type: 'string',
        description: '用戶顯示名稱（可選）',
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            authProvider: { type: 'string' },
            role: { type: 'string' },
            userType: { type: 'string' },
          },
        },
      },
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

/**
 * 獲取當前用戶 Schema
 */
export const getMeSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        authenticated: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            pictureUrl: { type: 'string' },
            authProvider: { type: 'string' },
            role: { type: 'string' },
            userType: { type: 'string' },
          },
        },
      },
    },
  },
};

/**
 * 管理員登入請求 Schema
 */
export const adminLoginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: '管理員電子郵件',
      },
      password: {
        type: 'string',
        minLength: 1,
        description: '管理員密碼',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            role: { type: 'string' },
            userType: { type: 'string', enum: ['admin'] },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

/**
 * LINE 登入請求 Schema
 */
export const lineLoginSchema = {
  body: {
    type: 'object',
    required: ['accessToken'],
    properties: {
      accessToken: {
        type: 'string',
        description: 'LIFF access token（由前端 liff.getAccessToken() 取得）',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        authenticated: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            displayName: { type: 'string' },
            pictureUrl: { type: 'string' },
            authProvider: { type: 'string' },
            role: { type: 'string' },
            userType: { type: 'string' },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

/**
 * 登出請求 Schema
 */
export const logoutSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
};
