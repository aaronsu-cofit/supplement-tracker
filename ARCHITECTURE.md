# Vitera Monorepo — 架構說明

## 目錄結構

```
vitera/
├── apps/                        # 前端 Next.js Apps（各自部署到 GCP Cloud Run）
│   ├── portal/                  # 入口頁（模組選擇、登入）           port 3000
│   │   └── Dockerfile
│   ├── wounds/                  # 傷口照護                          port 3001
│   │   └── Dockerfile
│   ├── supplements/             # 保健品管理                        port 3002
│   │   └── Dockerfile
│   ├── bones/                   # 骨骼關節照護（拇趾外翻 AI 檢測）   port 3003
│   │   └── Dockerfile
│   ├── intimacy/                # 親密健康                          port 3004
│   │   └── Dockerfile
│   └── hq/                      # 後台管理（模組、管理員）           port 3005
│       └── Dockerfile
│
├── backend/                     # Hono.js API Server（GCP Cloud Run）
│   ├── src/
│   │   ├── index.js             # 入口、CORS、路由掛載
│   │   ├── lib/
│   │   │   ├── db.js            # Prisma CRUD
│   │   │   ├── auth.js          # JWT sign/verify, bcrypt
│   │   │   └── ai.js            # Gemini API 封裝
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   └── routes/              # auth, supplements, wounds, bones, intimacy, hq, ...
│   ├── prisma/schema.prisma
│   ├── Dockerfile
│   └── .env.example
│
├── packages/
│   ├── lib/                     # @vitera/lib — 共用邏輯
│   │   └── src/
│   │       ├── AppLayout.jsx         # 標準 Layout（providers + auth guard）
│   │       ├── api.js                # apiFetch（帶 credentials）
│   │       ├── auth/
│   │       │   ├── AuthProvider.js   # useAuth, cookie-based session
│   │       │   └── AuthGuard.js      # 未登入時導向 login
│   │       ├── liff/LiffProvider.js  # LINE LIFF 初始化
│   │       ├── i18n/LanguageContext.js
│   │       ├── modules/ModuleProvider.js
│   │       └── wounds-constants.js
│   └── ui/                      # @vitera/ui — 共用 React 元件
│       └── src/
│           ├── AppHeader.jsx
│           ├── CameraCapture.jsx
│           └── icons.js
│
├── scripts/
│   ├── setup-local-env.sh       # 本機開發環境初始化（建立各 app 的 .env.local）
│   ├── deploy-backend.sh        # 後端部署到 GCP Cloud Run
│   └── deploy-frontend-cloudrun.sh  # 前端部署到 GCP Cloud Run（staging / production）
│
├── .env.local.example           # 本機 .env.local 範本
├── .env.cloudrun.example        # Cloud Run 部署環境變數範本
├── package.json                 # monorepo root（pnpm workspaces）
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 架構設計

### 前後端分離

```
LINE App / Browser
      │
      ▼
GCP Cloud Run (Frontend)        GCP Cloud Run (Backend)
┌──────────────────────┐        ┌──────────────────────┐
│  apps/portal         │        │   Hono.js API         │
│  apps/wounds         │──────▶ │   /api/*              │
│  apps/supplements    │        │                       │
│  apps/bones          │        │   Cloud SQL (PG) ◀───┤
│  apps/intimacy       │        │   Gemini AI      ◀───┤
│  apps/hq             │        │   LINE Bot SDK   ◀───┤
└──────────────────────┘        └──────────────────────┘
```

- **每個 `apps/*` 是獨立的 Cloud Run 服務**，Docker build context 為 monorepo 根目錄
- **Backend 統一一個 Cloud Run 服務**，所有 app 共用同一個 API endpoint
- 前端透過 `NEXT_PUBLIC_API_URL` 指向後端，**在 build 時 bake 進 JS bundle**

### 認證機制

1. 登入後，後端回傳 `Set-Cookie: auth_token`（httpOnly）
2. 所有 API 呼叫透過 `apiFetch()` 自動帶上 cookie（`credentials: 'include'`）
3. 後端 `authMiddleware` 讀取 cookie 驗證 JWT
4. LINE 用戶：LIFF 初始化後呼叫 `/api/auth/me (POST)` 完成靜默登入

### 共用套件

| 套件 | 主要匯出 |
|------|---------|
| `@vitera/lib` | `AppLayout`, `AuthProvider`, `AuthGuard`, `LiffProvider`, `apiFetch`, `LanguageProvider`, `ModuleProvider` |
| `@vitera/ui` | `AppHeader`, `CameraCapture`, icons |

所有 App 的 `next.config.mjs` 已設定：
```js
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@vitera/ui', '@vitera/lib'],
};
```

---

## 本地開發

### 前置需求

```
node >= 20
pnpm >= 9
Docker（若需要測試 production build）
```

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 設定環境變數

**後端：**
```bash
cp backend/.env.example backend/.env
# 填入：POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN
```

**前端（一次設定全部 app）：**
```bash
./scripts/setup-local-env.sh
# 會詢問各 app 的 LIFF ID，不需要可直接 Enter 略過
```

或手動複製：
```bash
cp .env.local.example apps/wounds/.env.local
# 視需要修改各 app 的 NEXT_PUBLIC_LIFF_ID
```

### 3. 啟動

```bash
pnpm dev                 # 全部（backend + 所有 app）
pnpm dev:wounds          # wounds + portal + backend
pnpm dev:bones           # bones + portal + backend
pnpm dev:supplements     # supplements + portal + backend
pnpm dev:intimacy        # intimacy + portal + backend
pnpm dev:hq              # hq + backend
```

啟動後各服務位址：

| 服務 | URL |
|------|-----|
| Backend API | http://localhost:8080 |
| Portal | http://localhost:3000 |
| Wounds | http://localhost:3001 |
| Supplements | http://localhost:3002 |
| Bones | http://localhost:3003 |
| Intimacy | http://localhost:3004 |
| HQ | http://localhost:3005 |

健康檢查：`GET http://localhost:8080/health`

---

## 部署

### 環境說明

| 環境 | Service 命名 | 設定檔 |
|------|-------------|-------|
| local | — | `apps/*/.env.local` |
| staging | `vitera-<app>-staging` | `.env.cloudrun.staging` |
| production | `vitera-<app>` | `.env.cloudrun.production` |

### 初次設定

```bash
# 複製範本，填入各環境的真實值
cp .env.cloudrun.example .env.cloudrun.staging
cp .env.cloudrun.example .env.cloudrun.production
```

### 後端部署

```bash
export GCP_PROJECT=your-project-id
./scripts/deploy-backend.sh

# 部署後在 GCP Console 設定 secrets：
# POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN
# ALLOWED_ORIGINS=<所有前端 URL，逗號分隔>
```

### 前端部署

```bash
# 單一 app
./scripts/deploy-frontend-cloudrun.sh portal --env staging
./scripts/deploy-frontend-cloudrun.sh wounds --env production

# 全部
./scripts/deploy-frontend-cloudrun.sh all --env staging
./scripts/deploy-frontend-cloudrun.sh all --env production

# 強制重新 build（不用 cache）
./scripts/deploy-frontend-cloudrun.sh all --env production --no-cache
```

---

## 新增 App 流程

1. **複製現有 app：**
   ```bash
   cp -r apps/bones apps/newapp
   ```

2. **修改 `apps/newapp/package.json`：**
   - `name`: `@vitera/newapp`
   - `scripts.dev`: `next dev -p <新 port>`

3. **`ClientLayout.js` 只需 3 行：**
   ```jsx
   'use client';
   import { AppLayout } from '@vitera/lib';
   export default function ClientLayout({ children }) {
     return <AppLayout>{children}</AppLayout>;
   }
   ```

4. **`apps/newapp/Dockerfile`：**
   複製任一現有 Dockerfile，把 app 名稱全部換掉即可。

5. **加入 turbo.json 的 dev filter（若需要）**

6. **在 `.env.cloudrun.staging` / `.env.cloudrun.production` 加上：**
   ```
   LIFF_ID_NEWAPP=your-liff-id
   ```

7. **在 `scripts/deploy-frontend-cloudrun.sh` 的 `APPS` 陣列加上 `newapp`**

---

## API 端點一覽

| 前綴 | 說明 | 認證 |
|------|------|------|
| `GET /health` | 健康檢查 | 無 |
| `/api/auth/*` | 登入、註冊、登出、取得當前用戶 | 部分 |
| `/api/supplements` | 保健品 CRUD | 需要 |
| `/api/checkins` | 服藥打卡紀錄 | 需要 |
| `/api/wounds` | 傷口 CRUD + 日誌 + SOAP | 需要 |
| `/api/footcare` | 足部評估 & 圖像 | 需要 |
| `/api/intimacy` | 親密健康評估 | 需要 |
| `/api/hq` | 模組管理、管理員 | 需要（admin） |
| `/api/analyze` | AI 圖像分析（標籤、傷口、外翻等） | 需要 |
| `/api/notify` | LINE 推播通知 | 需要 |
| `/api/modules` | 取得啟用中的模組清單 | 無 |

---

## 注意事項

### NEXT_PUBLIC_* 變數在 build 時 bake 進 bundle
修改 `NEXT_PUBLIC_*` 環境變數後，**必須重新 build 並部署**，不能在 Cloud Run Console 直接修改後生效。

### 資料庫 Dev Fallback
`backend/src/lib/db.js` 在 `POSTGRES_URL` 未設定時會使用 in-memory store，方便本地無需資料庫。**生產環境務必設定 `POSTGRES_URL`。**

### LIFF 整合
各 App 設定自己的 `NEXT_PUBLIC_LIFF_ID`（對應 LINE LIFF channel）。
若未設定，`LiffProvider` 以 browser 模式運作（不初始化 LIFF SDK），適合一般瀏覽器開發測試。
