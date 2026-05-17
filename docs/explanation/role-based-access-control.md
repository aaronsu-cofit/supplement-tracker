# 角色與權限控制 (Role-Based Access Control)

本文檔說明了 Vitera Monorepo 的權限分級架構，以便開發人員在實作後台 (Admin Panel) 或 API 時進行防護。

---

## 📊 資料表架構

Vitera 使用兩張獨立的表來管理使用者和管理員：

### `users` 表
- **用途**：一般使用者（病患、消費者）
- **認證方式**：LINE LIFF 或 Email + Password
- **role 欄位**：預設 `"user"`（保留欄位，未來可擴展權限等級）
- **資料表位置**：`backend/prisma/schema.prisma` → `model User`

### `admins` 表
- **用途**：管理員（醫師、護理師、系統管理員）
- **認證方式**：Email + Password（獨立登入端點）
- **role 欄位**：`"admin"` 或 `"superadmin"`
- **資料表位置**：`backend/prisma/schema.prisma` → `model Admin`

> **設計原則**：將管理員與一般使用者分離，確保關注點分離 (Separation of Concerns)，降低安全風險。

---

## 1. 角色定義 (Roles)

### 🧑‍💻 Super Admin (最高權限管理員)

**資料來源**：`admins` 表，`role = 'superadmin'`

- **職責**：系統擁有者、最高指揮官
- **權限範圍**：
  - 擁有系統中所有資源的讀寫與刪除權限
  - **唯一**允許進入 `/hq` 總樞紐中心（HQ 後台）
  - **唯一**允許執行 `/api/hq/*` 等系統級 API
  - **唯一**允許透過 `/hq/admins` 變更他人權限
  - 可以管理多租戶架構（LINE OA、Product 配置）
  - 可以查看和管理所有病患資料

---

### 🩺 Admin (一般管理員)

**資料來源**：`admins` 表，`role = 'admin'`

- **職責**：醫師、護理師、客服人員或小編
- **權限範圍**：
  - 允許進入各子模組的專屬後台（例如 `/wounds/admin`、`/bones/history`）
  - 可以查看所有病患的紀錄、照片與 AI 分析結果
  - 可以編輯或註記病患資料
  - **禁止**進入 `/hq` 改變系統架構或變更他人權限
  - **禁止**執行 `/api/hq/*` 系統級 API

> **注意**：目前 Admin 角色的模組後台權限檢查尚未完全實作，部分模組可能仍允許所有已認證使用者存取。

---

### 👤 User (一般病患/消費者)

**資料來源**：`users` 表，`role = 'user'`（預設值）

- **職責**：透過 LINE LIFF 或 Email 登入使用服務的最終用戶
- **權限範圍**：
  - 僅能查看與操作「與自己綁定 (依據 `user_id`)」的健康資料
  - 僅允許進入前端路由（如 `/wounds`、`/supplements`、`/period-tracker`）
  - **禁止**進入任何 `/hq` 或 `/*/admin` 結尾的後台路由
  - **禁止**存取其他使用者的資料

---

## 2. 認證流程

### Admin 認證流程

**登入端點**：`POST /api/auth/admin/login`

**實作位置**：`backend/src/services/auth.service.ts` → `adminLogin()`

**流程**：

1. 提交 `{ email, password }` 到 `/api/auth/admin/login`
2. 後端查詢 `admins` 表，驗證 bcrypt hash
3. 檢查 `deleted_at` 是否為 NULL（軟刪除檢查）
4. 簽發 JWT token，payload 包含：
   ```typescript
   {
     userId: admin.id,
     email: admin.email,
     isAdmin: true,    // 標記為管理員
     role: admin.role  // 'admin' 或 'superadmin'
   }
   ```
5. 回傳 `Set-Cookie: auth_token`

### User 認證流程

**登入端點**：
- LINE LIFF：`POST /api/auth/line`
- Email：`POST /api/auth/login`

**實作位置**：`backend/src/services/auth.service.ts` → `lineLogin()` / `emailLogin()`

**流程**：

1. 提交認證資訊（LINE access token 或 email/password）
2. 後端查詢 `users` 表，驗證身份
3. 簽發 JWT token，payload 包含：
   ```typescript
   {
     userId: user.id,
     email: user.email,
     // 注意：沒有 isAdmin 欄位
   }
   ```
4. 回傳 `Set-Cookie: auth_token`

> 詳細認證流程請參考：[Authentication & LIFF Integration](../reference/auth-flow.md)

---

## 3. API 防護實作 (Middleware)

### 3.1 Hard Auth (必須登入)

**實作位置**：`backend/src/middleware/auth.ts` → `authenticateUser()`

**用途**：必須有有效 JWT token，否則回傳 401

**使用範例**：

```typescript
import { authenticateUser } from '../middleware/auth.js';

// 在 Fastify route 中使用
app.get('/api/protected', { preHandler: [authenticateUser] }, async (request, reply) => {
  const userId = request.user.id; // 從 middleware 注入
  // ... 執行需要認證的邏輯 ...
});
```

**適用端點**：
- `/api/hq/*` (HQ 後台)
- `/api/me/*` (使用者個人資料)
- `/api/questionnaires/*` (問卷)
- 其他需要強制登入的端點

---

### 3.2 Soft Auth (允許匿名)

**實作位置**：`backend/src/middleware/auth.ts` → `softAuthenticateUser()`

**用途**：允許匿名模式，若無 token 則產生 UUID fallback

**流程**：

1. 嘗試從 `Authorization: Bearer <token>` header 取得 JWT
2. 若無，嘗試從 `auth_token` cookie 取得 JWT
3. 若無，嘗試從 `line_user_id` 或 `supplement_user_id` cookie 取得（舊版相容）
4. 若都沒有，生成新的 UUID 作為訪客 ID

**使用範例**：

```typescript
import { softAuthenticateUser } from '../middleware/auth.js';

app.post('/api/supplements', { preHandler: [softAuthenticateUser] }, async (request, reply) => {
  const userId = request.user.id; // 可能是真實 user ID 或 UUID
  // ... 執行邏輯 ...
});
```

**適用端點**：
- `/api/supplements` (保健品)
- `/api/wounds` (傷口照護)
- 其他允許試用的健康模組

---

### 3.3 Optional Auth (可選登入)

**實作位置**：`backend/src/middleware/auth.ts` → `optionalAuthenticateUser()`

**用途**：如果有有效 token 就設置 `request.user`，否則不拋出錯誤

**使用場景**：公開內容，但認證使用者可以看到更多資訊

---

### 3.4 Admin Role 檢查

**需要 Super Admin 權限的端點**（如 HQ API）應額外檢查角色：

```typescript
import { authenticateUser } from '../middleware/auth.js';
import { prisma } from '../lib/db.js';

app.get('/api/hq/sensitive', { preHandler: [authenticateUser] }, async (request, reply) => {
  const userId = request.user.id;

  // 查詢 Admin 表
  const admin = await prisma.admin.findUnique({
    where: { id: userId }
  });

  // 檢查是否為 Super Admin
  if (!admin || admin.role !== 'superadmin') {
    return reply.code(403).send({ error: 'Forbidden: Super Admin access required' });
  }

  // ... 執行高權限邏輯 ...
});
```

**實作範例**：`backend/src/controllers/hq.controller.ts`

---

## 4. JWT Token 規格

### Token Payload

```typescript
interface JWTPayload {
  userId: string;          // User.id 或 Admin.id
  email?: string;          // 使用者 email
  isAdmin?: boolean;       // Admin 登入時為 true
  role?: string;           // Admin 的角色 ('admin' 或 'superadmin')
  iat: number;            // Issued at
  exp: number;            // Expiry (365 天)
}
```

### Token 驗證

**實作位置**：`backend/src/lib/auth.ts` → `verifyToken()`

**驗證流程**：

1. 從 `Authorization: Bearer <token>` header 或 `auth_token` cookie 取得
2. 使用 `JWT_SECRET` 驗證簽章（HS256）
3. 檢查 `exp` 是否過期
4. 回傳 payload 或拋出 `UnauthorizedError`

---

## 5. 前端路由防護

### Next.js App Router (apps/portal, wounds, supplements 等)

**實作位置**：`packages/lib/src/auth/AuthProvider.tsx` → `AuthGuard`

**使用範例**：

```tsx
import { AuthProvider, AuthGuard } from '@vitera/lib/auth';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      <AuthGuard loginUrl="/login">
        {children}
      </AuthGuard>
    </AuthProvider>
  );
}
```

### Vite + React (apps/period-tracker)

**實作位置**：`packages/client-auth/src/useLiff.ts` → `useLiff()`

**使用範例**：

```tsx
import { useLiff } from '@vitera/client-auth';

function App() {
  const { isInitialized, isLoggedIn } = useLiff({
    liffId: import.meta.env.VITE_LIFF_ID,
    autoLogin: true,
  });

  if (!isInitialized) return <div>Loading...</div>;
  if (!isLoggedIn) return <div>Redirecting to LINE...</div>;

  return <MainApp />;
}
```

---

## 6. 資料庫管理

### Prisma Migrations

**Schema 位置**：`backend/prisma/schema.prisma`

**執行 migration**：

```bash
# 開發環境
pnpm --filter backend prisma migrate dev --name add_admin_role

# 生產環境
pnpm --filter backend prisma migrate deploy
```

### 初始 Super Admin 建立

由於系統沒有預設 Super Admin 帳號，第一位最高權限者需要手動建立：

**方法 1：透過資料庫 GUI (Neon Console)**

1. 連線到 PostgreSQL 資料庫
2. 執行 SQL：
   ```sql
   INSERT INTO admins (id, email, password_hash, display_name, role, created_at)
   VALUES (
     gen_random_uuid()::text,
     'admin@example.com',
     '$2a$10$...',  -- bcrypt hash of password
     'Super Admin',
     'superadmin',
     NOW()
   );
   ```

**方法 2：透過 API 註冊後手動升級**

1. 透過 `/api/auth/admin/register` 註冊（如果有此端點）
2. 在資料庫中手動將 `role` 從 `'admin'` 改為 `'superadmin'`

**方法 3：使用 Prisma Studio**

```bash
pnpm --filter backend prisma studio
```

進入 `admins` 表，手動建立或修改 role。

---

## 7. 安全性考量

### 7.1 Password Hashing

使用 bcrypt 進行密碼雜湊，salt rounds = 10

**實作位置**：`backend/src/lib/auth.ts` → `hashPassword()` / `comparePassword()`

```typescript
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(password, admin.password_hash);
```

### 7.2 Cookie Security

```typescript
{
  httpOnly: true,      // 防 XSS（JavaScript 無法存取）
  secure: true,        // Production only (HTTPS)
  sameSite: 'lax',     // CSRF 防護
  path: '/',
  maxAge: 365 * 24 * 60 * 60 * 1000  // 365 days
}
```

### 7.3 Soft Delete

- `users` 與 `admins` 表使用 `deleted_at` 標記軟刪除
- 軟刪除的帳號無法登入（登入時檢查 `deleted_at IS NULL`）
- 完整刪除流程請參考：`backend/src/lib/userDeletion.ts`

### 7.4 CORS 設定

生產環境嚴格限制來源：

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

if (!allowedOrigins.includes(origin)) {
  throw new Error('Not allowed by CORS');
}
```

---

## 8. 常見問題

### Q1: User 表也有 role 欄位，跟 Admin 的 role 有什麼不同？

- **User.role**：預設 `"user"`，保留欄位，目前未使用，未來可能用於區分病患等級（如 VIP、試用等）
- **Admin.role**：實際使用的管理員權限欄位，`"admin"` 或 `"superadmin"`

### Q2: 如何判斷當前登入者是 User 還是 Admin？

檢查 JWT payload 中的 `isAdmin` 欄位：

```typescript
const payload = await verifyToken(token);

if (payload.isAdmin) {
  // 這是 Admin（來自 admins 表）
  console.log('Admin role:', payload.role); // 'admin' 或 'superadmin'
} else {
  // 這是 User（來自 users 表）
}
```

### Q3: 可以用同一個 email 同時在 users 和 admins 表註冊嗎？

可以，因為這是兩張獨立的表。但不建議這樣做，會造成混淆。

### Q4: Admin 可以存取使用者的資料嗎？

可以。Admin（特別是 Super Admin）有權限查看所有使用者的健康資料，這是系統設計的一部分（用於醫護人員查看病患記錄）。

### Q5: 如何撤銷某個 Admin 的權限？

Super Admin 可以透過以下方式：

1. **降級**：將 `role` 從 `'superadmin'` 改為 `'admin'`（透過 HQ 介面或 API）
2. **停用**：設定 `deleted_at` 為當前時間（軟刪除）
3. **刪除**：直接從資料庫移除該筆記錄（不建議）

**實作端點**：`PATCH /api/hq/admins/:adminId`

---

## 9. 相關文件

- [Authentication & LIFF Integration](../reference/auth-flow.md) — 完整認證流程說明
- [API Endpoints](../reference/api-endpoints.md) — 所有 API 端點參考
- [Database Schema](../reference/database-schema.md) — Users 與 Admins 表結構
- [Architecture Overview](./architecture-overview.md) — 系統架構說明

---

**最後更新**：2026-05-17