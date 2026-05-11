# Fastify 配置文件

這個目錄包含 Fastify 框架的核心配置文件。

## 文件結構

```
src/config/
├── fastify.ts  - Fastify 應用主配置
└── logger.ts   - Pino 日誌配置
```

## fastify.ts

創建和配置 Fastify 應用實例，包括：

- ✅ **日誌配置**：開發環境使用 pino-pretty（彩色輸出），生產環境使用 JSON 格式
- ✅ **CORS 插件**：支持跨域請求，可通過 `ALLOWED_ORIGINS` 環境變量配置
- ✅ **Cookie 插件**：支持 Cookie 解析和設置
- ✅ **JWT 插件**：支持 JWT 認證，token 有效期 365 天
- ✅ **健康檢查**：`/health` 端點
- ✅ **404 處理**：自動處理未找到的路由

### 使用方式

```typescript
import { createFastifyApp } from './config/fastify.js';

const app = await createFastifyApp();

// 註冊你的路由
app.get('/api/users', async (request, reply) => {
  return { users: [] };
});

// 啟動服務器
await app.listen({ port: 8080, host: '0.0.0.0' });
```

### 環境變量

- `NODE_ENV`: 環境模式 (`production` 或其他)
- `LOG_LEVEL`: 日誌級別 (默認: `debug` 開發 / `info` 生產)
- `ALLOWED_ORIGINS`: 允許的跨域來源，用逗號分隔
- `JWT_SECRET`: JWT 簽名密鑰

## logger.ts

獨立的 Pino 日誌記錄器配置，可用於非 HTTP 上下文。

### 使用方式

```typescript
import { logger } from './config/logger.js';

logger.info('這是一條信息日誌');
logger.error('這是一條錯誤日誌');
logger.debug('這是一條調試日誌');
```

## 相關類型定義

HTTP 相關的 TypeScript 類型定義位於 `src/types/http.ts`：

- `JwtPayload`: JWT 載荷類型
- `AuthenticatedRequest`: 帶認證信息的請求類型
- `ApiResponse<T>`: API 響應類型
- `PaginationQuery`: 分頁查詢參數
- `ControllerContext`: 控制器上下文

## 測試驗證

所有配置已通過測試驗證：

- ✅ Fastify 應用創建成功
- ✅ 健康檢查路由正常工作
- ✅ 404 處理正確
- ✅ JWT 插件已註冊
- ✅ TypeScript 類型檢查通過
