# BaseController 使用指南

## 概述

`BaseController` 是 Vitera 後端 MVC 架構的控制層基礎類。所有具體的控制器都應該繼承這個基類，以獲得統一的請求處理、驗證和響應能力。

## 核心功能

### 1. 身份驗證

#### getUserId()
獲取當前已驗證用戶的 ID，如果用戶未驗證則返回 `null`。

```typescript
protected getUserId(): string | null
```

**使用場景**：適用於可選身份驗證的端點。

```typescript
class PostController extends BaseController {
  async getPost() {
    const userId = this.getUserId(); // 可能為 null

    if (userId) {
      // 返回包含用戶特定數據的帖子
    } else {
      // 返回公開版本
    }
  }
}
```

#### getAuthenticatedUserId()
獲取當前已驗證用戶的 ID，如果用戶未驗證則拋出錯誤。

```typescript
protected getAuthenticatedUserId(): string
```

**使用場景**：適用於必須身份驗證的端點。

```typescript
class ProfileController extends BaseController {
  async updateProfile() {
    const userId = this.getAuthenticatedUserId(); // 未驗證會拋出錯誤

    // 更新用戶資料...
  }
}
```

### 2. 請求驗證

#### validateRequired()
驗證請求體中的必需字段。

```typescript
protected validateRequired(
  body: any,
  requiredFields: string[]
): Record<string, any>
```

**示例**：

```typescript
class AuthController extends BaseController {
  async register() {
    const body = this.request.body as any;

    // 驗證必填字段
    this.validateRequired(body, ['email', 'password', 'name']);

    // 如果驗證失敗，會自動拋出 ValidationError
    // 包含詳細的錯誤信息: { field: 'email', message: 'email is required' }
  }
}
```

#### validateEmail()
驗證電子郵件格式。

```typescript
protected validateEmail(email: string): string
```

**示例**：

```typescript
class AuthController extends BaseController {
  async register() {
    const body = this.request.body as any;

    // 驗證並正規化 email
    const email = this.validateEmail(body.email);

    // 如果格式無效，拋出 ValidationError
  }
}
```

#### validatePassword()
驗證密碼強度（至少 6 個字符）。

```typescript
protected validatePassword(password: string): string
```

**示例**：

```typescript
class AuthController extends BaseController {
  async register() {
    const body = this.request.body as any;

    // 驗證密碼強度
    const password = this.validatePassword(body.password);

    // 少於 6 字符會拋出 ValidationError
  }
}
```

#### validateId()
驗證路由參數 ID 的有效性。

```typescript
protected validateId(id: string): string
```

**示例**：

```typescript
class WoundController extends BaseController {
  async getWound() {
    const params = this.request.params as any;

    // 驗證 ID 參數
    const woundId = this.validateId(params.id);

    // 空字符串或非字符串類型會拋出 ValidationError
  }
}
```

### 3. 響應方法

#### sendSuccess()
發送標準成功響應 (HTTP 200)。

```typescript
protected sendSuccess<T>(data: T, message: string = 'Success'): ApiResponse<T>
```

**示例**：

```typescript
class UserController extends BaseController {
  async getUser() {
    const user = await userService.findById(userId);

    return this.sendSuccess(user, 'User retrieved successfully');
  }
}

// 響應格式：
// {
//   success: true,
//   data: { id: '123', name: 'John' },
//   message: 'User retrieved successfully'
// }
```

#### sendCreated()
發送資源創建成功響應 (HTTP 201)。

```typescript
protected sendCreated<T>(data: T, message: string = 'Resource created'): ApiResponse<T>
```

**示例**：

```typescript
class WoundController extends BaseController {
  async createWound() {
    const wound = await woundService.create(data);

    return this.sendCreated(wound, 'Wound record created');
  }
}

// HTTP 狀態碼: 201
// {
//   success: true,
//   data: { id: 'wound-123', ... },
//   message: 'Wound record created'
// }
```

#### sendPaginated()
發送分頁列表響應。

```typescript
protected sendPaginated<T>(
  items: T[],
  total: number,
  page: number = 1,
  limit: number = 10
): any
```

**示例**：

```typescript
class WoundController extends BaseController {
  async listWounds() {
    const { page, limit, skip } = this.parsePaginationQuery(this.request.query);

    const [items, total] = await Promise.all([
      woundService.findMany({ skip, take: limit }),
      woundService.count()
    ]);

    return this.sendPaginated(items, total, page, limit);
  }
}

// 響應格式：
// {
//   success: true,
//   data: [ { id: '1', ... }, { id: '2', ... } ],
//   pagination: {
//     total: 45,
//     page: 2,
//     limit: 10,
//     totalPages: 5,
//     hasNextPage: true,
//     hasPreviousPage: true
//   }
// }
```

#### sendNoContent()
發送無內容響應 (HTTP 204) - 通常用於刪除操作。

```typescript
protected sendNoContent(): void
```

**示例**：

```typescript
class WoundController extends BaseController {
  async deleteWound() {
    const woundId = this.validateId(params.id);

    await woundService.delete(woundId);

    this.sendNoContent();
    // HTTP 204，無響應體
  }
}
```

### 4. 分頁處理

#### parsePaginationQuery()
解析和驗證分頁查詢參數。

```typescript
protected parsePaginationQuery(query: any): {
  page: number;
  limit: number;
  skip: number;
}
```

**示例**：

```typescript
class ProductController extends BaseController {
  async listProducts() {
    // 自動處理 ?page=2&limit=20
    const { page, limit, skip } = this.parsePaginationQuery(this.request.query);

    // page: 最小為 1
    // limit: 最小為 1，最大為 100
    // skip: 自動計算 (page - 1) * limit

    const products = await productService.findMany({
      skip,
      take: limit
    });

    return this.sendPaginated(products, totalCount, page, limit);
  }
}
```

### 5. Cookie 管理

#### setCookie()
設置 HTTP Cookie。

```typescript
protected setCookie(
  name: string,
  value: string,
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    maxAge?: number;
    path?: string;
  }
): void
```

**示例**：

```typescript
class AuthController extends BaseController {
  async login() {
    const token = await authService.login(email, password);

    // 設置安全的 httpOnly cookie
    this.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    });

    return this.sendSuccess({ token }, 'Login successful');
  }
}
```

#### clearCookie()
刪除 Cookie。

```typescript
protected clearCookie(name: string): void
```

**示例**：

```typescript
class AuthController extends BaseController {
  async logout() {
    // 清除認證 cookie
    this.clearCookie('auth_token');

    return this.sendSuccess(null, 'Logged out successfully');
  }
}
```

### 6. 日誌記錄

#### logDebug()
記錄調試信息。

```typescript
protected logDebug(message: string, data?: any): void
```

#### logWarn()
記錄警告信息。

```typescript
protected logWarn(message: string, data?: any): void
```

#### logError()
記錄錯誤信息。

```typescript
protected logError(message: string, error?: any): void
```

**示例**：

```typescript
class PaymentController extends BaseController {
  async processPayment() {
    this.logDebug('Processing payment', { orderId, amount });

    try {
      const result = await paymentService.charge(amount);
      return this.sendSuccess(result);
    } catch (error) {
      this.logError('Payment processing failed', error);
      throw error; // 會被 errorHandler 捕獲
    }
  }
}
```

### 7. 擴展點

#### transformRequestBody()
轉換請求體（可在子類中覆寫）。

```typescript
protected async transformRequestBody(body: any): Promise<any>
```

**示例**：

```typescript
class WoundController extends BaseController {
  // 覆寫以進行數據正規化
  protected async transformRequestBody(body: any): Promise<any> {
    return {
      ...body,
      type: body.type?.toUpperCase(), // 正規化類型
      createdAt: new Date(body.createdAt || Date.now()),
    };
  }

  async createWound() {
    const body = await this.transformRequestBody(this.request.body);
    // body 已被轉換
  }
}
```

#### transformResponse()
轉換響應數據（可在子類中覆寫）。

```typescript
protected transformResponse<T>(data: T): T
```

**示例**：

```typescript
class UserController extends BaseController {
  // 覆寫以隱藏敏感字段
  protected transformResponse(data: any): any {
    if (data && 'password' in data) {
      const { password, ...safeData } = data;
      return safeData;
    }
    return data;
  }

  async getUser() {
    const user = await userService.findById(userId);
    const transformed = this.transformResponse(user);
    return this.sendSuccess(transformed);
  }
}
```

## asyncHandler 包裝函數

用於包裝異步路由處理器，自動捕獲錯誤。

```typescript
export function asyncHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
)
```

**使用方式**：

```typescript
import { asyncHandler } from './controllers/base.controller.js';
import { AuthController } from './controllers/auth.controller.js';

// 在路由註冊中使用
app.post('/api/auth/register', asyncHandler(async (request, reply) => {
  const controller = new AuthController(request, reply);
  return controller.register();
}));

app.post('/api/auth/login', asyncHandler(async (request, reply) => {
  const controller = new AuthController(request, reply);
  return controller.login();
}));
```

**優點**：
- 自動捕獲異步錯誤
- 錯誤會傳遞給 Fastify 的錯誤處理中間件
- 避免未捕獲的 Promise rejection

## 完整示例：創建 AuthController

```typescript
// src/controllers/auth.controller.ts
import { BaseController } from './base.controller.js';
import { authService } from '../services/auth.service.js';

export class AuthController extends BaseController {
  /**
   * 用戶註冊
   * POST /api/auth/register
   */
  async register() {
    const body = this.request.body as any;

    // 1. 驗證必填字段
    this.validateRequired(body, ['email', 'password', 'name']);

    // 2. 驗證格式
    const email = this.validateEmail(body.email);
    const password = this.validatePassword(body.password);

    // 3. 業務邏輯
    const user = await authService.register({
      email,
      password,
      name: body.name,
    });

    // 4. 轉換響應（移除密碼）
    const safeUser = this.transformResponse(user);

    // 5. 返回成功響應
    return this.sendCreated(safeUser, 'User registered successfully');
  }

  /**
   * 用戶登入
   * POST /api/auth/login
   */
  async login() {
    const body = this.request.body as any;

    // 驗證
    this.validateRequired(body, ['email', 'password']);
    this.validateEmail(body.email);

    // 登入
    const { user, token } = await authService.login(
      body.email,
      body.password
    );

    // 設置 cookie
    this.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    });

    // 記錄日誌
    this.logDebug('User logged in', { userId: user.id });

    // 返回響應
    return this.sendSuccess(
      { user: this.transformResponse(user), token },
      'Login successful'
    );
  }

  /**
   * 用戶登出
   * POST /api/auth/logout
   */
  async logout() {
    const userId = this.getAuthenticatedUserId();

    // 清除 cookie
    this.clearCookie('auth_token');

    // 記錄日誌
    this.logDebug('User logged out', { userId });

    return this.sendSuccess(null, 'Logged out successfully');
  }

  /**
   * 獲取當前用戶資料
   * GET /api/auth/me
   */
  async getCurrentUser() {
    const userId = this.getAuthenticatedUserId();

    const user = await authService.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sendSuccess(
      this.transformResponse(user),
      'User retrieved'
    );
  }

  // 覆寫 transformResponse 以隱藏密碼
  protected transformResponse(data: any): any {
    if (data && 'password' in data) {
      const { password, ...safeData } = data;
      return safeData;
    }
    return data;
  }
}
```

## 路由註冊示例

```typescript
// src/routes/auth.routes.ts
import { FastifyInstance } from 'fastify';
import { asyncHandler } from '../controllers/base.controller.js';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  // 公開路由
  app.post('/api/auth/register', asyncHandler(async (request, reply) => {
    const controller = new AuthController(request, reply);
    return controller.register();
  }));

  app.post('/api/auth/login', asyncHandler(async (request, reply) => {
    const controller = new AuthController(request, reply);
    return controller.login();
  }));

  // 需要身份驗證的路由
  app.get('/api/auth/me', {
    preHandler: authenticate,
    handler: asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply);
      return controller.getCurrentUser();
    })
  });

  app.post('/api/auth/logout', {
    preHandler: authenticate,
    handler: asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply);
      return controller.logout();
    })
  });
}
```

## 錯誤處理

BaseController 與 Vitera 的錯誤處理中間件無縫集成：

```typescript
class WoundController extends BaseController {
  async createWound() {
    const body = this.request.body as any;

    // ValidationError 會自動被捕獲並返回 422 響應
    this.validateRequired(body, ['type', 'location']);

    try {
      const wound = await woundService.create(body);
      return this.sendCreated(wound);
    } catch (error) {
      // Prisma 錯誤會被 handlePrismaError 轉換
      // 其他錯誤會返回 500 響應
      throw error;
    }
  }
}
```

## 最佳實踐

### 1. 總是使用 asyncHandler
```typescript
// ✅ 好
app.post('/api/wounds', asyncHandler(async (request, reply) => {
  const controller = new WoundController(request, reply);
  return controller.create();
}));

// ❌ 不好（錯誤可能不會被捕獲）
app.post('/api/wounds', async (request, reply) => {
  const controller = new WoundController(request, reply);
  return controller.create();
});
```

### 2. 驗證在業務邏輯之前
```typescript
// ✅ 好
async createWound() {
  this.validateRequired(body, ['type']);
  const wound = await woundService.create(body);
  return this.sendCreated(wound);
}

// ❌ 不好（可能在驗證失敗前執行了業務邏輯）
async createWound() {
  const wound = await woundService.create(body);
  this.validateRequired(body, ['type']);
  return this.sendCreated(wound);
}
```

### 3. 使用適當的響應方法
```typescript
// ✅ 好
async createWound() {
  const wound = await woundService.create(body);
  return this.sendCreated(wound, 'Wound created'); // HTTP 201
}

async deleteWound() {
  await woundService.delete(id);
  this.sendNoContent(); // HTTP 204
}

// ❌ 不好（狀態碼不正確）
async createWound() {
  const wound = await woundService.create(body);
  return this.sendSuccess(wound); // 應該用 sendCreated
}
```

### 4. 記錄有意義的日誌
```typescript
// ✅ 好
this.logDebug('Processing payment', { orderId, amount, userId });
this.logError('Payment failed', error);

// ❌ 不好（日誌資訊不足）
this.logDebug('Processing');
this.logError('Error', null);
```

## 測試示例

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
    };
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      setCookie: vi.fn().mockReturnThis(),
    };
    controller = new AuthController(mockRequest, mockReply);
  });

  it('should register user successfully', async () => {
    mockRequest.body = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    const result = await controller.register();

    expect(result.success).toBe(true);
    expect(result.message).toBe('User registered successfully');
    expect(mockReply.code).toHaveBeenCalledWith(201);
  });

  it('should throw validation error for missing email', async () => {
    mockRequest.body = {
      password: 'password123',
      name: 'Test User'
    };

    await expect(() => controller.register()).rejects.toThrow('Validation failed');
  });
});
```

## 總結

BaseController 提供了：
- ✅ 統一的請求驗證
- ✅ 標準化的響應格式
- ✅ 完整的錯誤處理
- ✅ Cookie 和日誌管理
- ✅ 良好的可擴展性
- ✅ 類型安全

通過繼承 BaseController，你可以快速創建符合 MVC 架構的控制器，同時保持代碼的一致性和可維護性。
