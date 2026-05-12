# Vitera Backend: Hono → Fastify + MVC 遷移 實施規劃

> **對於代理執行者：** 推薦使用 superpowers:subagent-driven-development 逐任務執行此計劃。每個步驟使用複選框 (`- [ ]`) 語法追蹤進度。

**目標：** 將 Vitera backend 從 Hono 遷移到 Fastify，重構為 MVC 架構，提升性能 30-50%，完全保持 API 相容性。

**架構：** 分五個階段漸進式遷移。第一階段建立 Fastify 基礎設施和 MVC 框架；第二階段迅速遷移核心路由以驗證功能；第三、四階段完成 Services 和全量集成；第五階段進行完整測試和性能優化。

**技術棧：** Fastify (latest), Prisma 6.19.3, TypeScript 5.9.3, Vitest (測試), Pino (日誌)

---

## 📁 文件結構設計

### 新增目錄和文件

```
src/
├── config/
│   └── fastify.ts              # Fastify 初始化配置
├── controllers/
│   ├── auth.controller.ts
│   ├── supplements.controller.ts
│   ├── wounds.controller.ts
│   ├── hq.controller.ts
│   ├── intimacy.controller.ts
│   ├── ai.controller.ts
│   ├── scheduler.controller.ts
│   ├── wizard.controller.ts
│   └── ... (其他控制器)
├── services/
│   ├── auth.service.ts
│   ├── supplements.service.ts
│   ├── wounds.service.ts
│   ├── hq.service.ts
│   └── ... (其他服務)
├── models/
│   ├── user.model.ts
│   ├── wound.model.ts
│   ├── supplement.model.ts
│   └── ... (其他模型)
├── middleware/
│   ├── auth.middleware.ts      # JWT + Cookie 驗證
│   ├── errorHandler.ts         # 全局錯誤處理
│   └── logger.ts               # 日誌中間件
├── routes/                     # 路由組裝（橋接層）
│   ├── auth.ts
│   ├── supplements.ts
│   └── ... (其他路由)
├── types/                      # 保留（最小改動）
│   └── index.ts
├── lib/                        # 保留（最小改動）
│   ├── db.ts
│   ├── auth.ts
│   └── scheduler.ts
├── index.ts                    # 新的 Fastify 入口點
└── prisma/                     # 保留（不變）
```

### 改動的現有文件

```
package.json                    # 新增 Fastify 依賴
backend/src/
├── index.ts                    # 從 Hono 改為 Fastify
├── lib/db.ts                   # 最小改動（保持 Prisma 初始化）
└── lib/auth.ts                 # 保留（JWT、密碼邏輯不變）
```

---

## 📋 任務分解

### 🟢 第 1 階段：基礎設施 (3-4 天)

#### Task 1: 安裝 Fastify 依賴並更新 package.json

**文件:**
- Modify: `backend/package.json`

- [ ] **Step 1: 新增 Fastify 依賴**

編輯 `backend/package.json`，在 `dependencies` 中新增：

```json
{
  "dependencies": {
    "@fastify/cookie": "^11.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "fastify": "^5.0.0",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0"
  }
}
```

移除舊依賴：
```json
{
  "dependencies": {
    // 移除：
    // "@hono/node-server": "^1.13.7",
    // "hono": "^4.7.4"
  }
}
```

- [ ] **Step 2: 執行 pnpm install 安裝依賴**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm install
```

預期：所有依賴安裝成功，無錯誤。

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/pnpm-lock.yaml
git commit -m "chore(deps): add fastify dependencies and remove hono"
```

---

#### Task 2: 創建 Fastify 配置文件 (src/config/fastify.ts)

**文件:**
- Create: `backend/src/config/fastify.ts`

- [ ] **Step 1: 寫測試（驗證 Fastify 能初始化）**

Create `backend/src/config/fastify.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createFastifyApp } from './fastify';

describe('Fastify Config', () => {
  it('should create a Fastify instance', async () => {
    const app = await createFastifyApp();
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
    await app.close();
  });

  it('should have CORS enabled', async () => {
    const app = await createFastifyApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeDefined();
    await app.close();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm test -- src/config/fastify.test.ts
```

預期：FAIL - `createFastifyApp is not defined`

- [ ] **Step 3: 實現 Fastify 配置**

Create `backend/src/config/fastify.ts`:

```typescript
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { logger } from './logger';

export async function createFastifyApp() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

  const fastify = Fastify({
    logger: logger,
    trustProxy: isProd ? 1 : false,
  });

  // Register plugins
  await fastify.register(fastifyCors, {
    origin: (origin) => {
      if (!origin) return true; // allow non-browser requests
      if (!isProd) return true; // allow all in dev
      return allowedOrigins.includes(origin) ? origin : false;
    },
    credentials: true,
    maxAge: 86400,
  });

  await fastify.register(fastifyCookie);

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    sign: {
      expiresIn: '365d',
    },
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: 'Not found' });
  });

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error',
    });
  });

  return fastify;
}
```

Create `backend/src/config/logger.ts`:

```typescript
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm test -- src/config/fastify.test.ts
```

預期：PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/fastify.ts backend/src/config/logger.ts backend/src/config/fastify.test.ts
git commit -m "feat(config): initialize fastify with cors, cookies, jwt plugins"
```

---

#### Task 3: 創建中間件層 (JWT + Cookie + 錯誤處理)

**文件:**
- Create: `backend/src/middleware/auth.middleware.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Create: `backend/src/middleware/auth.middleware.test.ts`

- [ ] **Step 1: 寫 JWT 驗證中間件測試**

Create `backend/src/middleware/auth.middleware.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFastifyApp } from '../config/fastify';
import { signToken } from '../lib/auth';

describe('Auth Middleware', () => {
  let app;

  beforeEach(async () => {
    app = await createFastifyApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should verify JWT token from header', async () => {
    const token = await signToken('user-123');
    const response = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { Authorization: `Bearer ${token}` },
    });
    // 我們稍後會註冊 /test-protected 路由
    expect(response.statusCode).not.toBe(401);
  });

  it('should verify JWT token from cookie', async () => {
    const token = await signToken('user-123');
    const response = await app.inject({
      method: 'GET',
      url: '/test-protected',
      cookies: { auth_token: token },
    });
    expect(response.statusCode).not.toBe(401);
  });

  it('should reject request without token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-protected',
    });
    expect(response.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: 實現 JWT 驗證中間件**

Create `backend/src/middleware/auth.middleware.ts`:

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getCookie } from '@fastify/cookie';

export async function registerAuthMiddleware(fastify: FastifyInstance) {
  // 驗證 JWT token 的裝飾器
  fastify.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      let token: string | null = null;

      // 從 Authorization header 取 token
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }

      // 從 cookie 取 token
      if (!token) {
        token = request.cookies.auth_token || null;
      }

      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // 驗證 token
      try {
        const payload = await fastify.jwt.verify(token);
        request.userId = payload.sub;
        request.userType = payload.userType || 'user';
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}

declare global {
  namespace FastifyInstance {
    interface FastifyInstance {
      authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userType?: 'user' | 'admin';
  }
}
```

- [ ] **Step 3: 執行測試**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm test -- src/middleware/auth.middleware.test.ts
```

預期：PASS（假設 signToken 已實現）

- [ ] **Step 4: 實現錯誤處理中間件**

Create `backend/src/middleware/errorHandler.ts`:

```typescript
import type { FastifyInstance, FastifyError } from 'fastify';

export async function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(async (error: FastifyError & { statusCode?: number }, request, reply) => {
    const statusCode = error.statusCode || 500;

    fastify.log.error({
      err: error,
      statusCode,
      method: request.method,
      url: request.url,
    });

    return reply.status(statusCode).send({
      error: error.message || 'Internal server error',
      statusCode,
    });
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/auth.middleware.ts backend/src/middleware/errorHandler.ts backend/src/middleware/auth.middleware.test.ts
git commit -m "feat(middleware): add jwt authentication and error handling middleware"
```

---

#### Task 4: 創建 Controller 基礎類別

**文件:**
- Create: `backend/src/controllers/base.controller.ts`

- [ ] **Step 1: 實現 BaseController**

Create `backend/src/controllers/base.controller.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

export class BaseController {
  /**
   * 成功響應
   */
  protected success<T>(reply: FastifyReply, data: T, statusCode = 200) {
    return reply.status(statusCode).send(data);
  }

  /**
   * 錯誤響應
   */
  protected error(reply: FastifyReply, message: string, statusCode = 400) {
    return reply.status(statusCode).send({ error: message });
  }

  /**
   * 從請求體提取 JSON
   */
  async getBody<T = any>(request: FastifyRequest): Promise<T> {
    return request.body as T;
  }

  /**
   * 獲取用戶 ID（假設已驗證）
   */
  protected getUserId(request: FastifyRequest): string {
    if (!request.userId) {
      throw new Error('User ID not found in request');
    }
    return request.userId;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/controllers/base.controller.ts
git commit -m "feat(controllers): add BaseController with common response methods"
```

---

### 🟡 第 2 階段：核心路由遷移 (4-5 天)

#### Task 5: 遷移 Auth Controller + Service

**文件:**
- Create: `backend/src/controllers/auth.controller.ts`
- Create: `backend/src/services/auth.service.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/controllers/auth.controller.test.ts`

- [ ] **Step 1: 寫 Auth Service 測試**

Create `backend/src/services/auth.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { PrismaClient } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      admin: {
        findUnique: vi.fn(),
      },
    };
    service = new AuthService(prismaMock);
  });

  it('should authenticate user with correct password', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password_hash: '$2b$10$...', // hashed password
      display_name: 'Test User',
      auth_provider: 'email',
      role: 'user',
      deleted_at: null,
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    // 此測試會在後續步驟細化，確認密碼驗證邏輯
  });
});
```

- [ ] **Step 2: 實現 AuthService**

Create `backend/src/services/auth.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword, signToken } from '../lib/auth';

export class AuthService {
  constructor(private db: PrismaClient) {}

  /**
   * 用戶登入
   */
  async loginUser(email: string, password: string) {
    const user = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Email or password incorrect');
    }

    const isValidPassword = await comparePassword(password, user.password_hash!);
    if (!isValidPassword) {
      throw new Error('Email or password incorrect');
    }

    if (user.deleted_at) {
      throw new Error('Account is disabled');
    }

    const token = await signToken(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
      token,
    };
  }

  /**
   * 管理員登入
   */
  async loginAdmin(email: string, password: string) {
    const admin = await this.db.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      throw new Error('Email or password incorrect');
    }

    const isValidPassword = await comparePassword(password, admin.password_hash);
    if (!isValidPassword) {
      throw new Error('Email or password incorrect');
    }

    if (admin.deleted_at) {
      throw new Error('Account is disabled');
    }

    const token = await signToken(admin.id);

    return {
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
        userType: 'admin',
      },
      token,
    };
  }

  /**
   * 用戶註冊
   */
  async registerUser(email: string, password: string, displayName: string) {
    const existing = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new Error('Email already in use');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    const user = await this.db.user.create({
      data: {
        id,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        display_name: displayName || email.split('@')[0],
        auth_provider: 'email',
      },
    });

    const token = await signToken(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
      token,
    };
  }

  /**
   * 驗證 JWT token
   */
  async verifyToken(token: string, fastifyJwt: any) {
    try {
      const payload = await fastifyJwt.verify(token);
      return payload;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 3: 實現 AuthController**

Create `backend/src/controllers/auth.controller.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';

export class AuthController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }

  /**
   * POST /api/auth/login
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = await this.getBody<{
        email: string;
        password: string;
      }>(request);

      if (!email || !password) {
        return this.error(reply, 'Email and password required', 400);
      }

      const result = await this.authService.loginUser(email, password);

      // 設置 cookie
      reply.setCookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return this.success(reply, {
        success: true,
        user: result.user,
      });
    } catch (error: any) {
      return this.error(reply, error.message, 401);
    }
  }

  /**
   * POST /api/auth/register
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password, displayName } = await this.getBody<{
        email: string;
        password: string;
        displayName?: string;
      }>(request);

      if (!email || !password) {
        return this.error(reply, 'Email and password required', 400);
      }

      const result = await this.authService.registerUser(email, password, displayName || '');

      reply.setCookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return this.success(reply, {
        success: true,
        user: result.user,
      }, 201);
    } catch (error: any) {
      return this.error(reply, error.message, 400);
    }
  }

  /**
   * POST /api/auth/admin/login
   */
  async adminLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = await this.getBody<{
        email: string;
        password: string;
      }>(request);

      if (!email || !password) {
        return this.error(reply, 'Email and password required', 400);
      }

      const result = await this.authService.loginAdmin(email, password);

      reply.setCookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return this.success(reply, {
        success: true,
        user: result.user,
      });
    } catch (error: any) {
      return this.error(reply, error.message, 401);
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = this.getUserId(request);
      // TODO: 根據 userType 查詢用戶信息
      return this.success(reply, { authenticated: true });
    } catch (error: any) {
      return this.error(reply, error.message, 401);
    }
  }

  /**
   * DELETE /api/auth/me
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie('auth_token', { path: '/' });
    reply.clearCookie('supplement_user_id', { path: '/' });
    reply.clearCookie('line_user_id', { path: '/' });
    return this.success(reply, { success: true });
  }
}
```

- [ ] **Step 4: 實現 Auth 路由**

Create `backend/src/routes/auth.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { initializeDatabase } from '../lib/db';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';

export async function registerAuthRoutes(fastify: FastifyInstance) {
  const db = await initializeDatabase();
  const authService = new AuthService(db);
  const authController = new AuthController(authService);

  // 用戶登入
  fastify.post<{ Body: { email: string; password: string } }>(
    '/login',
    async (request, reply) => authController.login(request, reply)
  );

  // 用戶註冊
  fastify.post<{ Body: { email: string; password: string; displayName?: string } }>(
    '/register',
    async (request, reply) => authController.register(request, reply)
  );

  // 管理員登入
  fastify.post<{ Body: { email: string; password: string } }>(
    '/admin/login',
    async (request, reply) => authController.adminLogin(request, reply)
  );

  // 獲取當前用戶信息
  fastify.get('/me', async (request, reply) => {
    await (fastify as any).authenticate(request, reply);
    if (reply.sent) return; // 驗證失敗
    return authController.me(request, reply);
  });

  // 登出
  fastify.delete('/me', async (request, reply) => authController.logout(request, reply));
}
```

- [ ] **Step 5: 更新 index.ts（暫時不完整，只做框架）**

Create `backend/src/index.ts`:

```typescript
import 'dotenv/config';
import { createFastifyApp } from './config/fastify';
import { registerAuthMiddleware } from './middleware/auth.middleware';
import { registerErrorHandler } from './middleware/errorHandler';
import { registerAuthRoutes } from './routes/auth';

const port = parseInt(process.env.PORT || '8080', 10);

async function main() {
  const fastify = await createFastifyApp();

  // 註冊中間件
  await registerAuthMiddleware(fastify);
  await registerErrorHandler(fastify);

  // 註冊路由
  fastify.register(registerAuthRoutes, { prefix: '/api/auth' });

  // 啟動伺服器
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Backend running on port ${port}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

- [ ] **Step 6: 執行測試**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm test -- src/services/auth.service.test.ts
```

預期：PASS

- [ ] **Step 7: 測試 Auth 路由（本地）**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm dev
```

在另一個終端：
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

預期：返回 `{ error: "Email or password incorrect" }` (正常，因為沒有該用戶)

- [ ] **Step 8: Commit**

```bash
git add backend/src/controllers/auth.controller.ts backend/src/services/auth.service.ts backend/src/routes/auth.ts backend/src/index.ts
git commit -m "feat: migrate auth controller and service to fastify + mvc"
```

---

#### Task 6-12: 遷移其他核心路由（類似上面的模式）

**模式相同，針對以下路由：**
- `supplements` (Task 6)
- `wounds` (Task 7)
- `hq` (Task 8)
- `intimacy` (Task 9)
- `scheduler` (Task 10)
- `ai` (Task 11)
- `wizard` (Task 12)

每個任務遵循相同的步驟：
1. 寫 Service 測試
2. 實現 Service（業務邏輯）
3. 實現 Controller（HTTP 層）
4. 實現 Route（路由組裝）
5. 測試端點
6. Commit

**預計時間：** 4-5 天（並行或順序）

---

### 🔵 第 3 階段：Service 層重構 + 依賴注入 (3-4 天)

#### Task 13: 建立 DI 容器（簡單實現）

**文件:**
- Create: `backend/src/container.ts`

- [ ] **Step 1: 實現簡單 DI 容器**

Create `backend/src/container.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { initializeDatabase } from './lib/db';
import { AuthService } from './services/auth.service';
import { SupplementsService } from './services/supplements.service';
import { WoundsService } from './services/wounds.service';
// ... import other services

export class Container {
  private db: PrismaClient | null = null;
  private fastify: FastifyInstance | null = null;
  private services = new Map<string, any>();

  async initialize(fastifyInstance: FastifyInstance) {
    this.db = await initializeDatabase();
    this.fastify = fastifyInstance;
  }

  getDb(): PrismaClient {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  getFastify(): FastifyInstance {
    if (!this.fastify) throw new Error('Fastify not initialized');
    return this.fastify;
  }

  // Service factories
  getAuthService(): AuthService {
    if (!this.services.has('auth')) {
      this.services.set('auth', new AuthService(this.getDb()));
    }
    return this.services.get('auth');
  }

  getSupplementsService(): SupplementsService {
    if (!this.services.has('supplements')) {
      this.services.set('supplements', new SupplementsService(this.getDb()));
    }
    return this.services.get('supplements');
  }

  // ... other services

  async shutdown() {
    if (this.db) {
      await this.db.$disconnect();
    }
    if (this.fastify) {
      await this.fastify.close();
    }
  }
}

export const container = new Container();
```

- [ ] **Step 2: 更新 index.ts 使用 DI 容器**

Modify `backend/src/index.ts`:

```typescript
import 'dotenv/config';
import { createFastifyApp } from './config/fastify';
import { container } from './container';
import { registerAuthMiddleware } from './middleware/auth.middleware';
import { registerErrorHandler } from './middleware/errorHandler';
import { registerAuthRoutes } from './routes/auth';

const port = parseInt(process.env.PORT || '8080', 10);

async function main() {
  const fastify = await createFastifyApp();

  // 初始化 DI 容器
  await container.initialize(fastify);

  // 註冊中間件
  await registerAuthMiddleware(fastify);
  await registerErrorHandler(fastify);

  // 註冊路由
  fastify.register(registerAuthRoutes, { prefix: '/api/auth' });

  // 啟動伺服器
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Backend running on port ${port}`);

  // 優雅關閉
  process.on('SIGTERM', async () => {
    await container.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/container.ts backend/src/index.ts
git commit -m "feat: add simple DI container for service management"
```

---

### 🟣 第 4 階段：完整集成 (2-3 天)

#### Task 14: 遷移所有剩餘路由並集成

- [ ] **Step 1-N: 遷移剩餘 5+ 個路由**

模式同 Task 6-12，包括：
- `modules`
- `line/richmenu`
- `line/oa`
- `products`
- `scheduler` (Cron 任務適配)
- 等等

- [ ] **Step N+1: 整合所有路由到 index.ts**

Update `backend/src/index.ts` 以註冊所有路由：

```typescript
// ... 之前的代碼

fastify.register(registerAuthRoutes, { prefix: '/api/auth' });
fastify.register(registerSupplementsRoutes, { prefix: '/api/supplements' });
fastify.register(registerWoundsRoutes, { prefix: '/api/wounds' });
fastify.register(registerHqRoutes, { prefix: '/api/hq' });
fastify.register(registerIntimacyRoutes, { prefix: '/api/intimacy' });
fastify.register(registerAiRoutes, { prefix: '/api/ai' });
fastify.register(registerSchedulerRoutes, { prefix: '/api/scheduler' });
fastify.register(registerWizardRoutes, { prefix: '/api/wizard' });
fastify.register(registerMenuRoutes, { prefix: '/api/menu' });
fastify.register(registerWomenHealingRoutes, { prefix: '/api/women' });
fastify.register(registerProductsRoutes, { prefix: '/api/products' });
fastify.register(registerModulesRoutes, { prefix: '/api/modules' });
fastify.register(registerAnalyzeRoutes, { prefix: '/api/analyze' });
fastify.register(registerCheckinsRoutes, { prefix: '/api/checkins' });
fastify.register(registerNotifyRoutes, { prefix: '/api/notify' });
fastify.register(registerRichmenuRoutes, { prefix: '/api/line/richmenu' });
fastify.register(registerLineOaRoutes, { prefix: '/api/line/oa' });
fastify.register(registerWebhookRoutes, { prefix: '/webhook' });
fastify.register(registerMeRoutes, { prefix: '/api/me' });
```

- [ ] **Step N+2: Commit**

```bash
git add backend/src/routes/* backend/src/controllers/* backend/src/services/* backend/src/index.ts
git commit -m "feat: integrate all routes to fastify mvc architecture"
```

---

### 🟠 第 5 階段：測試 + 優化 (3-4 天)

#### Task 15: 全量集成測試

**文件:**
- Create: `backend/src/__tests__/integration/auth.integration.test.ts`
- Create: `backend/src/__tests__/integration/api.integration.test.ts`

- [ ] **Step 1: 寫完整的 Auth 集成測試**

Create `backend/src/__tests__/integration/auth.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFastifyApp } from '../../config/fastify';
import { container } from '../../container';

describe('Auth Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createFastifyApp();
    await container.initialize(app);
    // 註冊路由...
  });

  afterAll(async () => {
    await app.close();
    await container.shutdown();
  });

  it('should register and login a new user', async () => {
    // 1. 註冊
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const registerData = JSON.parse(registerResponse.payload);
    expect(registerData.success).toBe(true);
    expect(registerData.user.email).toBe('newuser@example.com');

    // 2. 登入
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'newuser@example.com',
        password: 'password123',
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginData = JSON.parse(loginResponse.payload);
    expect(loginData.success).toBe(true);
    expect(loginData.user.id).toBe(registerData.user.id);
  });

  it('should reject login with wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.statusCode).toBe(401);
    const data = JSON.parse(response.payload);
    expect(data.error).toContain('incorrect');
  });

  it('should get user info after authentication', async () => {
    // 先登入並取得 token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    const cookies = loginResponse.cookies;
    const token = cookies.find(c => c.name === 'auth_token')?.value;

    // 驗證 token
    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { auth_token: token },
    });

    expect(meResponse.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: 執行集成測試**

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/corepack pnpm test -- src/__tests__/integration/
```

預期：所有測試通過

- [ ] **Step 3: 性能基準測試**

Create `backend/load-test.sh`:

```bash
#!/bin/bash

# 啟動應用
npm run dev &
APP_PID=$!

sleep 2

# 執行負載測試（使用 Apache Bench）
echo "🔄 Running load test..."
ab -n 10000 -c 100 http://localhost:8080/health

# 停止應用
kill $APP_PID
```

執行：
```bash
chmod +x backend/load-test.sh
./backend/load-test.sh
```

預期：記錄吞吐量、延遲等指標

- [ ] **Step 4: 修復任何發現的 Bug**

根據集成測試和性能測試結果修復問題。

- [ ] **Step 5: Commit**

```bash
git add backend/src/__tests__/ backend/load-test.sh
git commit -m "test: add comprehensive integration and performance tests"
```

---

#### Task 16: 文檔和清理

- [ ] **Step 1: 更新 README**

Update `backend/README.md`:

```markdown
# Vitera Backend

Fastify + MVC 架構的 REST API 伺服器。

## 架構

- **Controllers**: HTTP 層，請求驗證和響應格式化
- **Services**: 業務邏輯層
- **Models**: 數據訪問層（Prisma）
- **Middleware**: 中間件層（驗證、錯誤處理等）

## 啟動

```bash
pnpm install
pnpm dev
```

## 測試

```bash
pnpm test
pnpm test:integration
```

## 部署

```bash
pnpm build
pnpm start
```
```

- [ ] **Step 2: 移除舊 Hono 相關代碼**

```bash
# 確認已無舊代碼引用
grep -r "hono" backend/src/ || echo "No hono references found"
```

- [ ] **Step 3: Commit**

```bash
git add backend/README.md
git commit -m "docs: update readme for fastify mvc architecture"
```

---

## 🎯 驗收檢查清單

在完成所有任務後：

- [ ] 所有 12+ 路由遷移完成
- [ ] 所有單元測試通過 (`pnpm test`)
- [ ] 所有集成測試通過 (`pnpm test:integration`)
- [ ] 功能測試 100% 相容（vs 舊 Hono 版本）
- [ ] 性能提升 ≥ 30%（吞吐量基準測試）
- [ ] 健康檢查正常 (`GET /health`)
- [ ] JWT + Cookie 驗證正常
- [ ] 錯誤處理統一且清晰
- [ ] 文檔完整（API、架構）
- [ ] 無 TypeScript 編譯錯誤 (`pnpm build`)

---

## 📊 時間預估

| 階段 | 任務 | 時間 |
|------|------|------|
| **1** | 基礎設施 (Tasks 1-4) | 3-4 天 |
| **2** | 核心路由遷移 (Tasks 5-12) | 4-5 天 |
| **3** | Service 層 + DI (Tasks 13-14) | 2-3 天 |
| **4** | 完整集成 (Tasks 15) | 1-2 天 |
| **5** | 測試 + 優化 (Tasks 16-17) | 3-4 天 |
| **總計** | | **2-3 週** |

---

## 回滾計劃

如果遇到重大問題，回滾步驟：

1. 保留舊 Hono 版本在 git 歷史中
2. 快速切回：`git revert <commit-hash>`
3. 重新部署舊版本到 staging

