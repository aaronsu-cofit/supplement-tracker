# DI 容器使用指南

## 概述

DI（Dependency Injection）容器是一個集中管理所有服務實例的系統，用於：

- 統一管理服務的創建和生命週期
- 實現單例模式，確保服務實例的唯一性
- 簡化服務依賴管理
- 提高代碼的可測試性和可維護性

## 基本用法

### 1. 獲取服務

在需要使用服務的地方，從容器中獲取服務實例：

```typescript
import { container } from './lib/container.js';
import type { AuthService } from './services/auth.service.js';

// 獲取服務實例
const authService = container.get<AuthService>('authService');

// 使用服務
const result = await authService.userLogin(email, password);
```

### 2. 在控制器中使用

控制器通常在構造函數中接收服務實例：

```typescript
export class AuthController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private authService: AuthService,
  ) {
    super(request, reply);
  }

  async login() {
    const body = await this.request.body;
    const result = await this.authService.userLogin(body.email, body.password);
    return this.sendSuccess(result);
  }
}
```

### 3. 在路由中使用

路由文件從容器獲取服務，然後傳遞給控制器：

```typescript
import { container } from '../lib/container.js';
import type { AuthService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  // 從容器獲取服務（單例）
  const authService = container.get<AuthService>('authService');

  app.post('/login', asyncHandler(async (request, reply) => {
    const controller = new AuthController(request, reply, authService);
    return controller.login();
  }));
}
```

### 4. 在測試中使用

測試時可以註冊 Mock 服務來替換真實服務：

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../lib/container.js';
import { vi } from 'vitest';

describe('AuthController', () => {
  let container: Container;
  let mockAuthService: any;

  beforeEach(() => {
    // 創建新的容器實例
    container = new Container();

    // 創建 Mock 服務
    mockAuthService = {
      userLogin: vi.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com' },
        token: 'mock-token',
      }),
    };

    // 註冊 Mock 服務
    container.register('authService', () => mockAuthService, true);
  });

  it('should login successfully', async () => {
    const authService = container.get('authService');
    const result = await authService.userLogin('test@example.com', 'password');

    expect(result.token).toBe('mock-token');
    expect(mockAuthService.userLogin).toHaveBeenCalledWith(
      'test@example.com',
      'password',
    );
  });
});
```

## 所有可用服務

容器中已註冊的服務列表：

| 服務名稱 | 類型 | 說明 |
|---------|------|------|
| `authService` | `AuthService` | 認證服務（用戶登入、註冊、驗證） |
| `supplementsService` | `SupplementsService` | 補充品管理服務 |
| `woundsService` | `WoundsService` | 傷口管理服務 |
| `hqService` | `HqService` | HQ 管理系統服務 |
| `intimacyService` | `IntimacyService` | 親密關係評估服務 |
| `schedulerService` | `SchedulerService` | 調度器服務 |
| `aiService` | `AiService` | AI 服務 |
| `wizardService` | `WizardService` | Wizard 場景管理服務 |

## 服務生命週期

### 單例模式（Singleton）

所有服務默認註冊為單例，這意味著：

1. **第一次調用時創建實例**：當第一次調用 `container.get()` 時，容器會調用工廠函數創建服務實例
2. **後續調用返回相同實例**：所有後續的 `get()` 調用都會返回同一個實例
3. **跨請求共享**：不同的 HTTP 請求會共享相同的服務實例

**示例：**

```typescript
// 第一次調用 - 創建實例
const service1 = container.get('authService');

// 第二次調用 - 返回相同實例
const service2 = container.get('authService');

// service1 === service2 (true)
console.log(service1 === service2); // true
```

**優點：**
- 節省內存（只創建一次）
- 保持狀態一致性
- 提高性能（避免重複創建）

**注意事項：**
- 服務應該是無狀態的或者線程安全的
- 避免在服務中存儲請求特定的數據

### 非單例模式（Transient）

如果需要每次都創建新實例，可以在註冊時設置 `singleton: false`：

```typescript
container.register('myService', () => new MyService(), false);
```

## 架構圖

```
┌─────────────────────────────────────────────────────────┐
│                      Fastify App                         │
│  (初始化時調用 initializeContainer)                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     DI Container                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ authService      → AuthService (singleton)       │  │
│  │ supplementsService → SupplementsService          │  │
│  │ woundsService    → WoundsService                 │  │
│  │ hqService        → HqService                     │  │
│  │ ...                                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                       Routes                             │
│  (從容器獲取服務實例)                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Controllers                           │
│  (接收服務實例作為構造函數參數)                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     Services                             │
│  (執行業務邏輯)                                          │
└─────────────────────────────────────────────────────────┘
```

## 添加新服務

如果需要添加新的服務到容器中，需要按照以下步驟：

### 1. 創建服務類

```typescript
// src/services/myNew.service.ts
import { PrismaClient } from '@prisma/client';

export class MyNewService {
  constructor(private prisma: PrismaClient) {}

  async doSomething() {
    // 實現業務邏輯
  }
}
```

### 2. 在 serviceFactory 中添加工廠函數

```typescript
// src/lib/serviceFactory.ts
import { MyNewService } from '../services/myNew.service.js';

export const serviceFactory = {
  // ... 現有服務
  myNewService: () => new MyNewService(db()),
};
```

### 3. 在 initializeContainer 中註冊服務

```typescript
// src/lib/initializeContainer.ts
export function initializeContainer(container: Container): void {
  // ... 現有註冊
  container.register('myNewService', serviceFactory.myNewService, true);
}
```

### 4. 在路由中使用

```typescript
// src/routes/myNew.routes.ts
import { container } from '../lib/container.js';
import type { MyNewService } from '../services/myNew.service.js';

export async function myNewRoutes(app: FastifyInstance) {
  const myNewService = container.get<MyNewService>('myNewService');

  app.get('/something', asyncHandler(async (request, reply) => {
    const controller = new MyNewController(request, reply, myNewService);
    return controller.doSomething();
  }));
}
```

## 最佳實踐

### 1. 使用 TypeScript 類型

始終為 `container.get()` 提供類型參數：

```typescript
// ✅ 好的做法
const authService = container.get<AuthService>('authService');

// ❌ 不好的做法
const authService = container.get('authService');
```

### 2. 在路由層獲取服務

服務應該在路由層從容器獲取，然後傳遞給控制器：

```typescript
// ✅ 好的做法 - 在路由中獲取
export async function authRoutes(app: FastifyInstance) {
  const authService = container.get<AuthService>('authService');

  app.post('/login', asyncHandler(async (request, reply) => {
    const controller = new AuthController(request, reply, authService);
    return controller.login();
  }));
}

// ❌ 不好的做法 - 在控制器中直接訪問容器
export class AuthController extends BaseController {
  async login() {
    const authService = container.get('authService'); // 避免這樣做
    // ...
  }
}
```

### 3. 測試時使用獨立容器

在測試中創建新的容器實例，避免污染全局容器：

```typescript
// ✅ 好的做法
describe('MyService', () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = new Container();
    testContainer.register('myService', () => mockService, true);
  });
});

// ❌ 不好的做法 - 污染全局容器
import { container } from '../lib/container.js';

describe('MyService', () => {
  beforeEach(() => {
    container.register('myService', () => mockService, true); // 污染全局
  });
});
```

### 4. 保持服務無狀態

由於服務是單例的，應該避免在服務中存儲請求特定的狀態：

```typescript
// ✅ 好的做法 - 無狀態服務
export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async userLogin(email: string, password: string) {
    // 所有數據都通過參數傳遞
  }
}

// ❌ 不好的做法 - 有狀態服務
export class AuthService {
  private currentUser: User | null = null; // 不要這樣做！

  async userLogin(email: string, password: string) {
    this.currentUser = await this.prisma.user.findUnique(...);
  }
}
```

## 常見問題

### Q: 為什麼使用 DI 容器？

A: DI 容器提供以下好處：
- **統一管理**：所有服務實例在一個地方創建和管理
- **單例保證**：確保每個服務只有一個實例
- **可測試性**：容易在測試中替換為 Mock 服務
- **解耦**：降低組件之間的耦合度

### Q: 服務是線程安全的嗎？

A: Node.js 是單線程的，所以不存在傳統意義上的線程安全問題。但是由於服務是單例的，多個並發請求會共享同一個服務實例，因此服務應該是無狀態的。

### Q: 如何在中間件中使用服務？

A: 可以通過 `app.container` 訪問容器（如果已裝飾），或者直接導入全局容器實例：

```typescript
import { container } from '../lib/container.js';

export async function myMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authService = container.get<AuthService>('authService');
  // 使用服務
}
```

### Q: 可以動態註冊服務嗎？

A: 可以，但建議在應用啟動時一次性註冊所有服務。如果需要動態註冊，確保在使用前完成註冊：

```typescript
// 動態註冊
container.register('dynamicService', () => new DynamicService(), true);

// 使用
const service = container.get('dynamicService');
```

## 參考資料

- [容器實現](/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/container.ts)
- [服務工廠](/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/serviceFactory.ts)
- [容器初始化](/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/initializeContainer.ts)
- [容器測試](/Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/__tests__/container.test.ts)
