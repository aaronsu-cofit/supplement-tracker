# Vitera Backend MVC 遷移指南

## 概述
本指南說明如何將現有的 Hono 路由遷移到 Fastify MVC 架構。

## 架構模式

```
┌─────────────────────────────────────┐
│          HTTP Request               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Routes (路由註冊)               │
│  - 路由定義                          │
│  - 中間件配置                        │
│  - Schema 應用                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Controller (HTTP 層)            │
│  - 請求參數處理                      │
│  - 調用 Service                     │
│  - 響應格式化                        │
│  - 日誌記錄                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Service (業務邏輯層)           │
│  - 業務規則驗證                      │
│  - 數據庫操作                        │
│  - 數據轉換                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Prisma Client (數據庫)           │
└─────────────────────────────────────┘
```

## 遷移步驟

### Step 1: 分析現有 Hono 路由

查看原始文件（如 `src/routes/supplements.ts`），確定：

1. **端點數量和類型**（GET, POST, PUT, DELETE）
2. **認證方式**（authMiddleware, softAuthMiddleware, 無）
3. **數據庫操作**（調用的 db 函數）
4. **業務邏輯**（驗證、轉換、默認值）
5. **響應格式**（返回的數據結構）

### Step 2: 創建 Service 層

**位置**: `src/services/[feature].service.ts`

**模板**:
```typescript
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

export class [Feature]Service {
  constructor(private prisma: PrismaClient) {}

  // 每個端點對應一個方法
  async getItems(userId: string) {
    return this.prisma.[model].findMany({
      where: { user_id: userId },
    });
  }

  async createItem(userId: string, data: CreateInput) {
    // 驗證
    if (!data.name?.trim()) {
      throw new ValidationError('Name is required', [
        { field: 'name', message: 'Name cannot be empty' },
      ]);
    }

    // 數據庫操作
    return this.prisma.[model].create({
      data: {
        user_id: userId,
        ...data,
      },
    });
  }

  async updateItem(userId: string, id: string, data: UpdateInput) {
    // ID 驗證
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a valid number' },
      ]);
    }

    // 權限檢查
    const existing = await this.prisma.[model].findFirst({
      where: { id: itemId, user_id: userId },
    });

    if (!existing) {
      throw new NotFoundError('Item not found');
    }

    // 更新
    return this.prisma.[model].update({
      where: { id: itemId },
      data,
    });
  }

  async deleteItem(userId: string, id: string) {
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a valid number' },
      ]);
    }

    await this.prisma.[model].deleteMany({
      where: { id: itemId, user_id: userId },
    });

    return { success: true };
  }
}
```

### Step 3: 創建 Controller 層

**位置**: `src/controllers/[feature].controller.ts`

**模板**:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { [Feature]Service } from '../services/[feature].service.js';

export class [Feature]Controller extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private service: [Feature]Service,
  ) {
    super(request, reply);
  }

  async getItems() {
    const userId = this.getAuthenticatedUserId();
    const items = await this.service.getItems(userId);
    this.logDebug('Fetched items', { userId, count: items.length });
    return items;
  }

  async createItem() {
    const userId = this.getAuthenticatedUserId();
    const body = (await this.request.body) as CreateInput;
    const item = await this.service.createItem(userId, body);
    this.logDebug('Created item', { userId, itemId: item.id });
    this.reply.code(201);
    return item;
  }

  async updateItem() {
    const userId = this.getAuthenticatedUserId();
    const { id } = this.request.params as { id: string };
    this.validateId(id);
    const body = (await this.request.body) as UpdateInput;
    const item = await this.service.updateItem(userId, id, body);
    this.logDebug('Updated item', { userId, itemId: item.id });
    return item;
  }

  async deleteItem() {
    const userId = this.getAuthenticatedUserId();
    const { id } = this.request.params as { id: string };
    this.validateId(id);
    const result = await this.service.deleteItem(userId, id);
    this.logDebug('Deleted item', { userId, itemId: id });
    return result;
  }
}
```

### Step 4: 創建 Schema 定義

**位置**: `src/schemas/[feature].schema.ts`

**模板**:
```typescript
const itemSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    user_id: { type: 'string' },
    name: { type: 'string' },
    // ... 其他字段
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
} as const;

const itemInputSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1 },
    // ... 其他字段
  },
} as const;

export const getItemsSchema = {
  description: '獲取項目列表',
  tags: ['items'],
  response: {
    200: {
      type: 'array',
      items: itemSchema,
    },
  },
} as const;

export const createItemSchema = {
  description: '創建新項目',
  tags: ['items'],
  body: itemInputSchema,
  response: {
    201: itemSchema,
  },
} as const;

// ... 其他端點的 schema
```

### Step 5: 創建 Routes 定義

**位置**: `src/routes/[feature].routes.ts`

**模板**:
```typescript
import { FastifyInstance } from 'fastify';
import { [Feature]Controller } from '../controllers/[feature].controller.js';
import { [Feature]Service } from '../services/[feature].service.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { db } from '../lib/db.js';
import { authenticateUser, softAuthenticateUser } from '../middleware/auth.js';
import {
  getItemsSchema,
  createItemSchema,
  updateItemSchema,
  deleteItemSchema,
} from '../schemas/[feature].schema.js';

export async function [feature]Routes(app: FastifyInstance) {
  const prisma = db();

  // 選擇認證中間件
  // authenticateUser - 嚴格認證（必須登入）
  // softAuthenticateUser - 軟認證（兼容匿名模式）
  app.addHook('onRequest', softAuthenticateUser);

  app.get(
    '/',
    { schema: getItemsSchema },
    asyncHandler(async (request, reply) => {
      const service = new [Feature]Service(prisma);
      const controller = new [Feature]Controller(request, reply, service);
      return controller.getItems();
    }),
  );

  app.post(
    '/',
    { schema: createItemSchema },
    asyncHandler(async (request, reply) => {
      const service = new [Feature]Service(prisma);
      const controller = new [Feature]Controller(request, reply, service);
      return controller.createItem();
    }),
  );

  app.put(
    '/:id',
    { schema: updateItemSchema },
    asyncHandler(async (request, reply) => {
      const service = new [Feature]Service(prisma);
      const controller = new [Feature]Controller(request, reply, service);
      return controller.updateItem();
    }),
  );

  app.delete(
    '/:id',
    { schema: deleteItemSchema },
    asyncHandler(async (request, reply) => {
      const service = new [Feature]Service(prisma);
      const controller = new [Feature]Controller(request, reply, service);
      return controller.deleteItem();
    }),
  );
}
```

### Step 6: 註冊路由

在 `src/fastify-app.ts` 中註冊新路由：

```typescript
import { [feature]Routes } from './routes/[feature].routes.js';

// 在 createFastifyApp 函數中
await app.register([feature]Routes, { prefix: '/api/[feature]' });
```

### Step 7: 創建測試

#### Service 測試
**位置**: `src/services/__tests__/[feature].service.test.ts`

測試內容：
- ✅ 成功場景（CRUD 操作）
- ✅ 驗證錯誤（缺少必填字段、無效格式）
- ✅ 權限檢查（跨用戶操作）
- ✅ 邊界情況（空列表、不存在的 ID）

#### Controller 測試
**位置**: `src/controllers/__tests__/[feature].controller.test.ts`

測試內容：
- ✅ HTTP 請求處理
- ✅ 響應格式化
- ✅ 錯誤傳播
- ✅ 日誌記錄

#### 路由集成測試（可選）
**位置**: `src/routes/__tests__/[feature].routes.test.ts`

測試內容：
- ✅ 完整的 HTTP 流程
- ✅ Schema 驗證
- ✅ 認證中間件
- ✅ CORS 配置

## 認證中間件選擇

根據原 Hono 實現選擇對應的 Fastify 中間件：

| Hono | Fastify | 說明 |
|------|---------|------|
| `authMiddleware` | `authenticateUser` | 嚴格認證，必須有有效 JWT token |
| `softAuthMiddleware` | `softAuthenticateUser` | 軟認證，兼容匿名模式 |
| 無認證 | `optionalAuthenticateUser` 或不使用 | 可選認證 |

## 錯誤處理

使用統一的錯誤類：

```typescript
import { ValidationError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler.js';

// 驗證錯誤
throw new ValidationError('Invalid input', [
  { field: 'name', message: 'Name is required' },
]);

// 資源不存在
throw new NotFoundError('Item not found');

// 未授權
throw new UnauthorizedError('Authentication required');
```

## 測試最佳實踐

1. **Mock 外部依賴**: Prisma Client, JWT 驗證函數
2. **測試隔離**: 每個測試前清空 mocks
3. **完整覆蓋**: 測試成功路徑和所有錯誤情況
4. **真實場景**: 使用真實的輸入數據和邊界情況

## 遷移檢查清單

- [ ] 分析原 Hono 路由（端點、認證、邏輯）
- [ ] 創建 Service 層（業務邏輯）
- [ ] 創建 Controller 層（HTTP 處理）
- [ ] 創建 Schema 定義（驗證和文檔）
- [ ] 創建 Routes 定義（路由註冊）
- [ ] 註冊到 fastify-app.ts
- [ ] 創建 Service 測試
- [ ] 創建 Controller 測試
- [ ] （可選）創建路由集成測試
- [ ] 驗證 API 兼容性（響應格式、狀態碼）
- [ ] 驗證功能完整性（所有業務邏輯）
- [ ] 更新文檔

## 完成示例

參考 Supplements 路由遷移：
- Service: `src/services/supplements.service.ts`
- Controller: `src/controllers/supplements.controller.ts`
- Schema: `src/schemas/supplements.schema.ts`
- Routes: `src/routes/supplements.routes.ts`
- 測試: `src/services/__tests__/supplements.service.test.ts`
- 文檔: `SUPPLEMENTS_MIGRATION.md`

## 常見問題

### Q: Service 層應該包含什麼？
A: 所有業務邏輯、數據庫操作、驗證規則。不應該包含 HTTP 相關的代碼（request, reply）。

### Q: Controller 層應該包含什麼？
A: HTTP 請求處理、參數提取、調用 Service、響應格式化、日誌記錄。不應該包含業務邏輯。

### Q: 如何確保 API 兼容性？
A: 保持相同的：
- 端點路徑
- HTTP 方法
- 請求體格式
- 響應數據結構
- HTTP 狀態碼
- 錯誤響應格式

### Q: 何時使用軟認證？
A: 當原 Hono 路由使用 `softAuthMiddleware` 時，表示需要兼容匿名/訪客模式，使用 `softAuthenticateUser`。

### Q: 測試應該覆蓋什麼？
A:
- Service: 業務邏輯的所有分支、驗證、權限檢查
- Controller: HTTP 處理、用戶認證檢查
- Routes（可選）: 完整的 HTTP 流程、Schema 驗證

## 下一步

完成 Supplements 遷移後，按以下順序遷移其他路由：

1. ✅ Supplements (已完成)
2. ⏳ Wounds
3. ⏳ HQ (Admin routes)
4. ⏳ Bones (Foot care)
5. ⏳ Intimacy
6. ⏳ CheckIns
7. ⏳ 其他路由...
