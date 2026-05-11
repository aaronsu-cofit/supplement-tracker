# Vitera Backend 中間件層

本目錄包含 Fastify 中間件和工具函數，用於處理認證、錯誤處理和日誌記錄。

## 文件結構

```
middleware/
├── auth.middleware.ts      # JWT 和 Cookie 認證中間件
├── errorHandler.ts         # 全局錯誤處理和自定義錯誤類
├── logger.ts               # 請求日誌中間件
├── authMiddleware.ts       # (舊版 Hono 認證中間件，保留用於兼容)
├── requireRole.ts          # (舊版 Hono 角色驗證，保留用於兼容)
└── __tests__/
    └── middleware.test.ts  # 中間件單元測試
```

## 使用方式

### 1. auth.middleware.ts

提供三種認證中間件和一個 Cookie 工具函數。

#### authMiddleware

基本認證中間件，從 Authorization header 或 Cookie 讀取 JWT token。

```typescript
import { authMiddleware } from './middleware/auth.middleware.js';

// 在路由中使用
app.addHook('preHandler', authMiddleware);

// 或在特定路由上使用
app.get('/api/profile', {
  preHandler: [authMiddleware],
  handler: async (request, reply) => {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    // ... 處理邏輯
  }
});
```

#### requireAuthMiddleware

需要認證的路由保護中間件，如果用戶未驗證則返回 401。

```typescript
import { requireAuthMiddleware } from './middleware/auth.middleware.js';

// 保護需要登入的路由
app.get('/api/private', {
  preHandler: [authMiddleware, requireAuthMiddleware],
  handler: async (request, reply) => {
    const user = (request as AuthenticatedRequest).user;
    // 這裡 user 一定存在
    return { userId: user.id };
  }
});
```

#### softAuthMiddleware

Soft auth 中間件，嘗試多種方式獲取用戶 ID，如果都沒有則生成 guest ID。

```typescript
import { softAuthMiddleware } from './middleware/auth.middleware.js';

// 用於支持匿名和已認證用戶的路由
app.get('/api/data', {
  preHandler: [softAuthMiddleware],
  handler: async (request, reply) => {
    const user = (request as AuthenticatedRequest).user;
    // user.id 一定存在（可能是真實用戶或 guest ID）
    return { userId: user.id };
  }
});
```

#### createAuthTokenCookie

創建 JWT token Cookie 的工具函數。

```typescript
import { createAuthTokenCookie } from './middleware/auth.middleware.js';

const isProd = process.env.NODE_ENV === 'production';
const token = 'jwt-token-here';
const cookieOptions = createAuthTokenCookie(token, isProd);

reply.setCookie('auth_token', token, cookieOptions);
```

### 2. errorHandler.ts

提供全局錯誤處理和自定義錯誤類。

#### 註冊錯誤處理器

```typescript
import { registerErrorHandler } from './middleware/errorHandler.js';

const app = await createFastifyApp();
registerErrorHandler(app);
```

#### 自定義錯誤類

```typescript
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from './middleware/errorHandler.js';

// 在路由中使用
app.get('/api/users/:id', async (request, reply) => {
  const user = await getUserById(request.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
});

// 驗證錯誤
app.post('/api/users', async (request, reply) => {
  const { email } = request.body;
  if (!email) {
    throw new ValidationError('Email is required', [
      { field: 'email', message: 'This field is required' }
    ]);
  }
  // ... 處理邏輯
});
```

#### Prisma 錯誤處理

```typescript
import { handlePrismaError, asyncHandler } from './middleware/errorHandler.js';

// 方式 1: 手動處理
app.post('/api/users', async (request, reply) => {
  try {
    const user = await prisma.user.create({ data: request.body });
    return user;
  } catch (error) {
    throw handlePrismaError(error);
  }
});

// 方式 2: 使用 asyncHandler
app.post('/api/users', asyncHandler(async (request, reply) => {
  // Prisma 錯誤會自動轉換
  const user = await prisma.user.create({ data: request.body });
  return user;
}));
```

### 3. logger.ts

提供請求日誌中間件。

```typescript
import { registerLoggerMiddleware } from './middleware/logger.ts';

const app = await createFastifyApp();
registerLoggerMiddleware(app);
```

日誌功能：
- `onRequest`: 記錄請求開始（method, url, query）
- `onResponse`: 記錄請求結束（statusCode, responseTime）
- `preHandler`: 開發環境記錄請求 body（敏感信息會被過濾）

## 與 Hono 中間件的兼容性

本項目目前使用 Hono 作為主框架，但正在遷移到 Fastify。新的中間件與現有 Hono 中間件功能對應：

| Fastify 中間件 | Hono 中間件 | 說明 |
|---------------|------------|------|
| `auth.middleware.ts` | `authMiddleware.ts` | JWT 和 Cookie 認證 |
| `errorHandler.ts` | `index.ts` 中的 `app.onError` | 錯誤處理 |
| `logger.ts` | `app.use('*', logger())` | 請求日誌 |

## 測試

運行測試：

```bash
pnpm test
```

運行特定測試文件：

```bash
pnpm test middleware
```

## 注意事項

1. **JWT 驗證**: `authMiddleware` 使用 `@fastify/jwt` 插件的 `request.jwtVerify()` 方法
2. **Cookie 讀取**: 使用 `@fastify/cookie` 插件的 `request.cookies` 對象
3. **錯誤處理**: 所有自定義錯誤都會被全局錯誤處理器捕獲並轉換為統一的 JSON 響應
4. **日誌記錄**: Fastify 內置的 Pino logger 已在 `src/config/fastify.ts` 中配置
5. **角色驗證**: `createRoleMiddleware` 是框架，實際角色查詢應在 Service 層實現

## 遷移指南

從 Hono 遷移到 Fastify 時：

1. 將 `c: Context` 替換為 `request: FastifyRequest, reply: FastifyReply`
2. 將 `c.get('userId')` 替換為 `(request as AuthenticatedRequest).user.id`
3. 將 `c.json({ ... }, statusCode)` 替換為 `reply.code(statusCode).send({ ... })`
4. 將 Hono 中間件 `await next()` 替換為 Fastify 的 `return` 或直接 `reply.send()`
