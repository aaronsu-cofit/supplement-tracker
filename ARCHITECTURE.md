# Cofit Monorepo — 架構說明 & 啟動指南

## 目錄結構

```
supplement-tracker/
├── apps/                    # 前端 Next.js Apps（各自獨立部署到 Vercel）
│   ├── portal/              # 入口頁（模組選擇、登入）           port 3000
│   ├── wounds/              # 傷口照護                          port 3001
│   ├── supplements/         # 保健品管理                        port 3002
│   ├── bones/               # 骨骼關節照護（拇趾外翻 AI 檢測）   port 3003
│   ├── intimacy/            # 親密健康                          port 3004
│   └── hq/                  # 後台管理（模組、管理員）           port 3005
│
├── backend/                 # Hono.js API Server（部署到 GCP Cloud Run）
│   ├── src/
│   │   ├── index.js         # 入口、CORS、路由掛載
│   │   ├── lib/
│   │   │   ├── db.js        # 資料庫 CRUD（Neon PostgreSQL）
│   │   │   ├── auth.js      # JWT sign/verify, bcrypt
│   │   │   └── ai.js        # Gemini API 呼叫封裝
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   # Bearer token / cookie 雙重驗證
│   │   └── routes/
│   │       ├── auth.js      # /api/auth/*
│   │       ├── supplements.js
│   │       ├── checkins.js
│   │       ├── wounds.js
│   │       ├── bones.js     # /api/footcare/*
│   │       ├── intimacy.js
│   │       ├── hq.js
│   │       ├── analyze.js   # AI 圖像分析
│   │       ├── notify.js    # LINE 推播
│   │       └── modules.js   # 公開模組清單
│   ├── Dockerfile
│   └── .env.example
│
├── packages/
│   ├── lib/                 # @cofit/lib — 共用邏輯
│   │   └── src/
│   │       ├── api.js            # apiFetch, setAuthToken, clearAuthToken
│   │       ├── auth/AuthProvider.js
│   │       ├── liff/LiffProvider.js
│   │       ├── i18n/LanguageContext.js
│   │       ├── modules/ModuleProvider.js
│   │       └── wounds-constants.js
│   └── ui/                  # @cofit/ui — 共用 React 元件
│       └── src/
│           ├── AppHeader.jsx
│           ├── CameraCapture.jsx
│           └── icons.js
│
├── scripts/
│   ├── deploy-backend.sh       # GCP Cloud Run 部署
│   ├── deploy-frontend.sh      # Vercel 部署（單一 app 或全部）
│   └── setup-vercel-projects.sh  # 首次 Vercel 專案初始化
│
├── package.json             # monorepo root（pnpm workspaces）
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
 Vercel (Frontend)          GCP Cloud Run (Backend)
 ┌─────────────────┐        ┌──────────────────────┐
 │  apps/portal    │        │   Hono.js API         │
 │  apps/wounds    │──────▶ │   /api/*              │
 │  apps/supplements│        │                      │
 │  apps/bones     │        │   Neon PostgreSQL ◀──┤
 │  apps/intimacy  │        │   Gemini AI       ◀──┤
 │  apps/hq        │        │   LINE Bot SDK    ◀──┤
 └─────────────────┘        └──────────────────────┘
```

- **每個 `apps/*` 對應一個獨立 Vercel Project**，在 Vercel 設定 `Root Directory` 為 `apps/<name>`
- **Backend 統一部署一個 Cloud Run 服務**，所有 Apps 共用同一個 API endpoint
- 前端透過環境變數 `NEXT_PUBLIC_API_URL` 指向後端

### 認證機制

1. 登入成功後，後端回傳 JWT `token`
2. 前端用 `setAuthToken(token)` 存入 `localStorage`（key: `cofit_auth_token`）
3. 後續所有 API 呼叫透過 `apiFetch()` 自動附加 `Authorization: Bearer <token>` header
4. 後端 `authMiddleware` 優先讀取 Bearer token，fallback 到 cookie（向後相容）
5. LINE 用戶：LIFF 初始化後自動呼叫 `/api/auth/me` (POST) 完成靜默登入

### 共用套件

| 套件 | 用途 |
|------|------|
| `@cofit/lib` | `apiFetch`, `AuthProvider`, `LiffProvider`, `ModuleProvider`, `LanguageProvider`, wounds 常數 |
| `@cofit/ui` | `AppHeader`, `CameraCapture`, icon 元件 |

所有 Apps 的 `next.config.mjs` 必須加上：
```js
const nextConfig = { transpilePackages: ['@cofit/ui', '@cofit/lib'] };
```

---

## 本地開發啟動

### 前置需求

```bash
node >= 20
pnpm >= 9
```

### 1. 安裝依賴

```bash
# 在 monorepo 根目錄執行，會同時安裝所有 workspace 的依賴
pnpm install
```

### 2. 設定環境變數

**後端：**
```bash
cp backend/.env.example backend/.env
# 填入以下變數：
# POSTGRES_URL=       ← Neon PostgreSQL 連線字串
# JWT_SECRET=         ← 任意隨機字串（生產環境請用 256-bit 以上）
# GEMINI_API_KEY=     ← Google AI Studio 取得
# LINE_CHANNEL_ACCESS_TOKEN=  ← LINE Developers 取得
```

**前端（每個 App 各別設定，或統一設定後複製）：**
```bash
# 在每個 apps/* 目錄建立 .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/portal/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/wounds/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/supplements/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/bones/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/intimacy/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/hq/.env.local
```

若有 LINE LIFF 整合，另外設定（各 App 的 LIFF ID 不同）：
```bash
echo "NEXT_PUBLIC_LIFF_ID=your-liff-id" >> apps/portal/.env.local
```

### 3. 啟動所有服務

**全部同時啟動（推薦）：**
```bash
pnpm dev
# Turborepo 會並行啟動 backend + 所有 apps
```

**單獨啟動：**
```bash
# 只啟動後端
cd backend && pnpm dev

# 只啟動特定前端
cd apps/wounds && pnpm dev

# 或使用 turbo filter
pnpm turbo dev --filter=@cofit/wounds
pnpm turbo dev --filter=@cofit/backend
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

## 生產部署

### 後端 → GCP Cloud Run

```bash
# 設定 GCP 專案 ID
export GCP_PROJECT=your-project-id

# 部署（會自動 build Docker image 並上傳）
./scripts/deploy-backend.sh

# 部署完成後，設定 Cloud Run 環境變數（在 GCP Console 或 CLI）：
# POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN
# ALLOWED_ORIGINS=https://your-portal.vercel.app,https://your-wounds.vercel.app,...
```

> Dockerfile 說明：Node 20 Alpine，直接 `node src/index.js` 啟動，無 build step。

### 前端 → Vercel

**首次設定（只需執行一次）：**
```bash
# 會互動式地為每個 App 建立/連結 Vercel 專案，並設定環境變數
export NEXT_PUBLIC_API_URL=https://your-backend.run.app
./scripts/setup-vercel-projects.sh
```

**後續部署：**
```bash
# 部署單一 App（預覽環境）
./scripts/deploy-frontend.sh portal

# 部署單一 App（生產環境）
./scripts/deploy-frontend.sh wounds --prod

# 部署所有 App（生產環境）
./scripts/deploy-frontend.sh all --prod
```

**Vercel 專案設定注意事項：**
- `Root Directory` 設為 `apps/<name>`（例如 `apps/wounds`）
- Framework Preset: `Next.js`
- Build Command: `cd ../.. && pnpm turbo build --filter=<package-name>` 或讓 Vercel 自動偵測

---

## 新增服務流程

1. 複製現有 App 目錄作為範本：
   ```bash
   cp -r apps/bones apps/newservice
   ```

2. 修改 `apps/newservice/package.json`：
   - `name`: `@cofit/newservice`
   - `scripts.dev`: `next dev -p <新 port>`

3. 修改 `apps/newservice/src/app/layout.js`：更新 `metadata.title`

4. 修改 `apps/newservice/src/app/page.js`：實作新功能

5. 在後端 `backend/src/routes/` 新增路由檔案，並在 `backend/src/index.js` 掛載

6. 建立 `.env.local` 設定 `NEXT_PUBLIC_API_URL`

7. 在 Vercel 建立新專案，`Root Directory` 指向 `apps/newservice`

**不需要修改任何現有 App，也不需要動 backend 主要邏輯。**

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

## 已知注意事項

### 根目錄 `src/` 是舊版遺留代碼
`/src/app/` 是遷移前的原始 Next.js API routes，目前無作用。新架構的 API 全在 `/backend/src/routes/`。日後可移除此目錄。

### 資料庫 Dev Fallback
`backend/src/lib/db.js` 在 `POSTGRES_URL` 未設定時會使用 in-memory store，方便本地開發無需資料庫。**生產環境務必設定 `POSTGRES_URL`。**

### LIFF 整合
各 App 可設定自己的 `NEXT_PUBLIC_LIFF_ID`。若未設定，`LiffProvider` 會以 browser 模式運作（不初始化 LIFF SDK），適合一般瀏覽器開發測試。
