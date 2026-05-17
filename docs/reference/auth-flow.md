# Authentication & LIFF Integration

本專案實作了一套靈活的雙重登入系統，允許使用者透過 LINE 自動判定登入 (LIFF)，或者在沒有 LINE 環境下使用傳統 Email / Password。

---

## 📦 認證套件架構

Vitera monorepo 目前有**兩套並存的認證實作**，分別服務不同的前端框架需求：

### 1. `packages/client-auth` — 現代化、框架無關

**位置**：[packages/client-auth/](../../packages/client-auth/)

**特性**：
- ✅ **框架無關**：不依賴 Next.js，可用於任何 React 框架（Vite、CRA、Remix 等）
- ✅ **TypeScript 優先**：完整型別定義，編譯輸出至 `dist/`
- ✅ **純 Hooks & Utilities**：
  - `useLiff()` — React Hook，管理 LIFF SDK 生命週期
  - `handleLiffLogin()` — 從 LIFF 取得 access token 並登入後端
  - `loginWithLine()` — 將 LINE access token 換成系統 JWT
- ✅ **單例模式**：使用 `liffManager` 確保 LIFF SDK 只載入一次
- ✅ **依賴清晰**：只依賴 `@vitera/utils`（共用工具）和 `@line/liff`

**使用範例**（Vite + React）：
```tsx
import { useLiff, handleLiffLogin } from '@vitera/client-auth';

function App() {
  const { isInitialized, isLoggedIn, profile } = useLiff({
    liffId: import.meta.env.VITE_LIFF_ID,
    autoLogin: true,
    onLoggedIn: async (accessToken) => {
      await handleLiffLogin(); // 換取系統 JWT
    }
  });

  if (!isInitialized) return <div>Loading...</div>;
  if (!isLoggedIn) return <div>Redirecting to LINE...</div>;
  return <div>Hello, {profile?.displayName}</div>;
}
```

**目前使用者**：
- ✅ `apps/period-tracker` (Vite + React)

---

### 2. `packages/lib/src/auth` — Next.js App Router 專用

**位置**：[packages/lib/src/auth/](../../packages/lib/src/auth/)

**特性**：
- ⚠️ **Next.js 耦合**：依賴 `next/navigation` 的 `usePathname()` 和 `useRouter()`
- ⚠️ **Context-based**：使用 React Context 管理全局認證狀態
- ✅ **整合 LiffProvider**：與 `packages/lib/src/liff/LiffProvider.tsx` 緊密整合
- ✅ **完整狀態管理**：內建 `user`、`isAuthenticated`、`isLoading`
- ✅ **提供完整認證流程**：
  - `login()` — Email 登入
  - `loginAsAdmin()` — 管理員登入
  - `register()` — Email 註冊
  - `logout()` — 登出

**使用範例**（Next.js App Router）：
```tsx
import { AuthProvider, useAuth, AuthGuard } from '@vitera/lib/auth';

function LoginPage() {
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" />;

  return (
    <button onClick={() => login('user@example.com', 'password')}>
      Login
    </button>
  );
}

// 在 layout.tsx 中包裹整個 app
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

**目前使用者**：
- ✅ `apps/portal`
- ✅ `apps/wounds`
- ✅ `apps/supplements`
- ✅ `apps/bones`
- ✅ `apps/intimacy`
- ✅ `apps/hq`

## 🔐 認證系統流程與優先級

系統的目標是：**如果有 LINE 環境就自動無縫登入，如果沒有就退回到 Email 登入。**

```text
                    ┌──────────────┐
                    │  /login 頁面  │
                    └──────┬───────┘
                 ┌─────────┼─────────┐
                 ▼                   ▼
        LINE 自動/手動登入         Email 表單
        liff.login()          POST /api/auth/register
              │               POST /api/auth/login
              ▼                     │
     LINE OAuth 跳轉               ▼
              │               驗證 → hash → 查詢/建檔
              ▼                     │
     回到 App → LIFF getProfile     │
              │                     │
              ▼                     ▼
     POST /api/auth/line      簽發 JWT Token: signToken(userId)
     findOrCreateLineUser          │
              │                     │
              ▼                     ▼
         signToken(userId)   Set Cookie: auth_token (httpOnly)
              │
              ▼
     Set Cookie: auth_token (httpOnly)
```

---

## 👤 認證相關 API

### Email 認證流程

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/auth/register` | POST | Email 註冊 (email, password, displayName) |
| `/api/auth/login` | POST | Email 登入 (email, password) |
| `/api/auth/logout` | POST | 登出（清除 cookie） |
| `/api/auth/me` | GET | 取得當前 session 資訊 |

**Email 註冊流程：**

1. 前端提交 `{ email, password, displayName }` 到 `/api/auth/register`
2. 後端使用 bcrypt hash password
3. 建立 User record，`auth_provider = 'email'`
4. 簽發 JWT token
5. 回傳 `Set-Cookie: auth_token`

**Email 登入流程：**

1. 前端提交 `{ email, password }` 到 `/api/auth/login`
2. 後端查詢 User，驗證 bcrypt hash
3. 簽發 JWT token
4. 回傳 `Set-Cookie: auth_token`

---

### LINE LIFF 認證流程

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/auth/line` | POST | LINE LIFF 登入 (lineUserId, displayName, pictureUrl) |

**LINE 登入流程：**

1. LIFF SDK 初始化（`packages/lib/src/liff/LiffProvider.tsx`）
2. 檢查 `liff.isLoggedIn()`
3. 若未登入且在 LINE 客戶端內，自動呼叫 `liff.login()`
4. 登入成功後，呼叫 `liff.getProfile()` 取得 userId, displayName, pictureUrl
5. 前端提交到 `/api/auth/line`
6. 後端執行 `findOrCreateUser({ lineUserId, displayName, pictureUrl })`
7. 簽發 JWT token
8. 回傳 `Set-Cookie: auth_token`

---

### Admin 認證流程

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/auth/admin/login` | POST | 管理員登入 (email, password) |

**與一般 Email 登入的差異：**

- 查詢 `admins` 表（而非 `users` 表）
- 需要 `role = 'admin'` 或 `role = 'superadmin'`
- 簽發的 JWT token payload 含 `isAdmin: true`

---

## 🔑 JWT Token 規格

### Token 內容

```typescript
interface JWTPayload {
  userId: string;          // User.id or Admin.id
  email?: string;
  isAdmin?: boolean;       // Admin 登入時為 true
  iat: number;            // Issued at
  exp: number;            // Expiry
}
```

### Token 參數

- **演算法**：HS256
- **密鑰**：環境變數 `JWT_SECRET`
- **有效期**：365 天
- **存放位置**：瀏覽器 Cookie (`auth_token`)

### Cookie 屬性

```typescript
{
  httpOnly: true,      // 防 XSS
  secure: true,        // Production only (HTTPS)
  sameSite: 'lax',     // CSRF 保護
  path: '/',
  maxAge: 365 * 24 * 60 * 60 * 1000  // 365 days
}
```

---

## 🎯 使用者識別優先級

所有 API 都依賴以下優先級來判定目前是哪個使用者：

**實作位置**：`backend/src/middleware/auth.ts`

### 1. **JWT Token (最高優先級)**

```typescript
const token = request.cookies.auth_token;
const decoded = verifyJWT(token);
const userId = decoded.userId;
```

**適用範圍**：所有已登入的使用者（Email 或 LINE）

### 2. **Soft Auth Fallback (匿名模式)**

若無有效 JWT，部分模組支援匿名模式（supplements, wounds 等健康模組）：

```typescript
// 產生匿名 UUID
const userId = uuidv4();
```

**用途**：
- 允許未登入使用者試用健康功能
- 後續可透過 LINE 或 Email 登入綁定資料

---

## 🔄 LIFF SDK 整合

### LIFF Provider 實作

**位置**：`packages/lib/src/liff/LiffProvider.tsx`

**初始化流程：**

1. Component mount 後，根據 `pathname` 決定使用哪個 LIFF ID
   - `/supplements` → `NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS`
   - `/wounds` → `NEXT_PUBLIC_LIFF_ID_WOUNDS`
   - `/period-tracker` → `NEXT_PUBLIC_LIFF_ID_PERIOD_TRACKER`
   - 等等...

2. 呼叫 `liff.init({ liffId })`

3. 若 `liff.isLoggedIn()` 回傳 true：
   - 呼叫 `liff.getProfile()` 取得 userId, displayName, pictureUrl
   - 設定 Profile State
   - 呼叫 `/api/auth/line` 完成後端登入

4. 若在 LINE 客戶端內 (`liff.isInClient()`) 但尚未登入：
   - 自動呼叫 `liff.login()` 執行無縫登入

5. 若不在 LINE 環境：
   - 以 browser 模式運作（不初始化 LIFF SDK）
   - 使用 Email 登入

### LIFF ID 設定

每個 app 透過環境變數設定自己的 LIFF ID：

```bash
# apps/wounds/.env.local
NEXT_PUBLIC_LIFF_ID=1234567890-abcdefgh

# apps/period-tracker/.env.local
NEXT_PUBLIC_LIFF_ID=0987654321-zyxwvuts
```

---

## 🛡️ 認證中間件

### 1. Hard Auth (`authenticateUser`)

**位置**：`backend/src/middleware/auth.ts`

**用途**：必須有有效 JWT token，否則回傳 401

```typescript
export async function authenticateUser(request, reply) {
  const token = request.cookies.auth_token;

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    return reply.status(401).send({ error: 'Invalid token' });
  }

  request.userId = decoded.userId;
}
```

**適用端點**：
- `/api/hq/*` (HQ 後台)
- `/api/me/*` (使用者個人資料)
- `/api/questionnaires/*` (問卷)
- 等等...

### 2. Soft Auth (`softAuthenticateUser`)

**位置**：`backend/src/middleware/auth.ts`

**用途**：允許匿名模式，若無 token 則產生 UUID fallback

```typescript
export async function softAuthenticateUser(request, reply) {
  const token = request.cookies.auth_token;

  if (token) {
    const decoded = verifyJWT(token);
    if (decoded) {
      request.userId = decoded.userId;
      return;
    }
  }

  // Fallback: 匿名 UUID
  request.userId = uuidv4();
}
```

**適用端點**：
- `/api/supplements` (保健品)
- `/api/wounds` (傷口照護)
- 其他健康模組

### 3. Admin Auth

**HQ 端點額外檢查：**

```typescript
if (user.role !== 'admin' && user.role !== 'superadmin') {
  return reply.status(403).send({ error: 'Forbidden' });
}
```

---

## 📱 LINE 主動推播通知

### Push Message API

**端點**：`POST /api/notify`

**用途**：
- 傷口照護完成後主動推播分析結果
- 定期健康提醒
- 任務完成通知

**需要設定：**
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

**實作**：使用 `@line/bot-sdk`

```typescript
import { Client } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

await client.pushMessage(lineUserId, {
  type: 'text',
  text: 'Your wound assessment is ready!',
});
```

---

## 🔐 安全性考量

### 1. Password Hashing

使用 bcrypt 進行密碼雜湊，salt rounds = 10

```typescript
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(password, user.password_hash);
```

### 2. Cookie Security

- `httpOnly`: 防止 JavaScript 存取（XSS 防護）
- `secure`: 僅在 HTTPS 傳輸（Production）
- `sameSite: 'lax'`: CSRF 防護
- `path: '/'`: 全站有效

### 3. JWT Expiry

Token 有效期 365 天，但可透過環境變數調整：

```typescript
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '365d',
});
```

### 4. CORS 設定

生產環境嚴格限制來源：

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

// Only allow requests from whitelisted origins
if (!allowedOrigins.includes(origin)) {
  throw new Error('Not allowed by CORS');
}
```

---

## 🔄 Session 管理

### 登出流程

```typescript
// 前端
await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});

// 後端
reply.clearCookie('auth_token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});
```

### Session 持久化

- Cookie 有效期：365 天
- 使用者關閉瀏覽器後 session 仍然有效
- 若需要實作「記住我」vs「登入一次」，可透過不同的 `maxAge` 設定

---

## 🧪 開發與測試

### 本地測試 Email 登入

```bash
# 註冊
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}' \
  -c cookies.txt

# 登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 驗證 session
curl http://localhost:8080/api/auth/me -b cookies.txt
```

### LIFF 測試環境

1. 在 LINE Developers Console 建立 LIFF app
2. 設定 Endpoint URL 為本地開發位址（需使用 ngrok 等工具）
3. 複製 LIFF ID 到 `.env.local`
4. 在 LINE App 中開啟 LIFF URL 測試

---

## 🔗 相關文件

- [API Endpoints](./api-endpoints.md) — 所有 API 端點參考
- [Database Schema](./database-schema.md) — Users 與 Admins 表結構
- [Architecture Overview](../explanation/architecture-overview.md) — 系統架構說明
