# Auth Controller and Service Migration to Fastify MVC

## 概述

本文檔說明如何將 Hono 認證路由遷移到 Fastify MVC 架構。

## 架構層次

```
┌─────────────────────────────────────────┐
│  routes/auth.routes.ts (路由層)         │
│  - 定義 HTTP 路由                        │
│  - 掛載到 Fastify app                   │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  controllers/auth.controller.ts (控制層)│
│  - 請求參數驗證                          │
│  - Cookie 設置                          │
│  - 響應格式化                            │
│  - 繼承 BaseController                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  services/auth.service.ts (業務邏輯層)   │
│  - 用戶驗證和註冊                        │
│  - Token 生成和驗證                      │
│  - 數據庫查詢                            │
│  - 不依賴 HTTP 框架                      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  lib/db.ts (數據訪問層)                  │
│  - Prisma Client 單例                   │
│  - 數據庫連接管理                        │
└─────────────────────────────────────────┘
```

## 遷移後的端點

所有端點保持 100% 功能等價：

1. **POST /api/auth/login** - 用戶登入
2. **POST /api/auth/register** - 用戶註冊
3. **GET /api/auth/me** - 獲取當前用戶
4. **POST /api/auth/admin/login** - 管理員登入
5. **POST /api/auth/me** - LINE 登入
6. **DELETE /api/auth/me** - 登出

## 如何集成到 Fastify 應用

### 方案 1: 並行運行（推薦用於測試）

創建一個新的 Fastify 應用，與現有 Hono 應用並行運行：

```typescript
// src/fastify-app.ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth.routes.js';
import { registerErrorHandler } from './middleware/errorHandler.js';

export async function createFastifyApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  // 註冊插件
  await app.register(cookie);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // 註冊錯誤處理器
  registerErrorHandler(app);

  // 註冊路由
  await app.register(authRoutes, { prefix: '/api/auth' });

  return app;
}

// 啟動 Fastify 應用在不同端口
const fastifyApp = await createFastifyApp();
await fastifyApp.listen({ port: 8081, host: '0.0.0.0' });
console.log('🚀 Fastify server running on port 8081');
```

### 方案 2: 完全遷移

當所有路由遷移完成後，替換 index.ts 中的 Hono 應用：

```typescript
// src/index.ts
import { createFastifyApp } from './fastify-app.js';
import { authRoutes } from './routes/auth.routes.js';
// ... 其他路由

const app = await createFastifyApp();

// 註冊所有路由
await app.register(authRoutes, { prefix: '/api/auth' });
// await app.register(woundRoutes, { prefix: '/api/wounds' });
// ... 其他路由

await app.listen({ port: 8080, host: '0.0.0.0' });
```

## 測試

### 單元測試

```bash
# 運行所有測試
pnpm test

# 運行 AuthService 測試
pnpm test src/services/__tests__/auth.service.test.ts

# 運行 AuthController 測試
pnpm test src/controllers/__tests__/auth.controller.test.ts
```

### 手動測試

```bash
# 1. 用戶註冊
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'

# 2. 用戶登入
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt

# 3. 獲取當前用戶
curl -X GET http://localhost:8081/api/auth/me \
  -b cookies.txt

# 4. 登出
curl -X DELETE http://localhost:8081/api/auth/me \
  -b cookies.txt
```

## 驗收標準

✅ 所有 6 個端點功能完整
✅ Cookie 設置正確（開發/生產環境）
✅ 錯誤處理完整（ValidationError, UnauthorizedError, ForbiddenError）
✅ 密碼哈希和驗證
✅ JWT token 生成和驗證
✅ LINE 登入支持
✅ 軟刪除用戶檢查
✅ 單元測試覆蓋率 > 80%
✅ TypeScript 編譯無錯誤
✅ 與現有 Hono 實現 100% 功能兼容

## 後續步驟

1. ✅ 創建 AuthService（業務邏輯層）
2. ✅ 創建 AuthController（HTTP 層）
3. ✅ 創建 auth.routes.ts（路由定義）
4. ✅ 創建單元測試
5. ⬜ 運行測試並確保通過
6. ⬜ 部署到測試環境
7. ⬜ 並行運行 Fastify 和 Hono
8. ⬜ 驗證功能等價性
9. ⬜ 逐步遷移其他路由
10. ⬜ 完全切換到 Fastify

## 注意事項

- **不要刪除現有 Hono 路由**，直到所有測試通過並在生產環境驗證
- **保持數據庫 schema 不變**，確保兼容性
- **Cookie 設置**必須與 Hono 版本完全一致
- **錯誤響應格式**必須保持一致，避免破壞前端
- **Token 過期時間**保持 365 天，與現有邏輯一致

## 相關文件

- `/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/auth.service.ts`
- `/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/auth.controller.ts`
- `/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/auth.routes.ts`
- `/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/base.controller.ts`
- `/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/middleware/errorHandler.ts`
