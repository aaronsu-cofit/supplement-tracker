# 新人快速上手教學

這篇教學會指引您如何在本地端將 **Vitera** 專案跑起來，並了解 Git 工作流程。

---

## 1. 前置需求

- **Node.js v20+**
- **pnpm v9**（`npm install -g pnpm@9`）
- **Git**
- **Docker**（選用，若需要本地 PostgreSQL 資料庫或測試 production build）

---

## 2. 快速啟動

```bash
# Clone 專案
git clone <your-repo-url>
cd Vitera

# 安裝所有 workspace 依賴
pnpm install

# 啟動本地 PostgreSQL 資料庫（必要步驟）
docker-compose up -d

# 設定環境變數（後端）
cp backend/.env.example backend/.env
# 編輯 backend/.env，填入必要的環境變數（見下方說明）

# 設定環境變數（前端 - 一次設定全部 app）
./scripts/setup-local-env.sh
# 或手動複製到各 app：
# cp .env.local.example apps/portal/.env.local
# cp .env.local.example apps/wounds/.env.local
# ... (重複其他 app)

# 啟動特定模組（擇一）
pnpm dev:wounds       # 傷口照護 + portal + backend
pnpm dev:bones        # 骨骼模組 + portal + backend
pnpm dev:supplements  # 保健品 + portal + backend
pnpm dev:hq           # 後台管理 + backend
pnpm dev:intimacy     # 親密健康 + portal + backend
pnpm dev:period-tracker # 經期追蹤 + backend
pnpm dev:portal       # 入口 + backend
pnpm dev              # 啟動全部（較吃資源，不建議）
```

各 app 預設 port：

| App            | Port | URL                      |
|----------------|------|--------------------------|
| Backend API    | 8080 | http://localhost:8080    |
| portal         | 3000 | http://localhost:3000    |
| wounds         | 3001 | http://localhost:3001    |
| supplements    | 3002 | http://localhost:3002    |
| bones          | 3003 | http://localhost:3003    |
| intimacy       | 3004 | http://localhost:3004    |
| hq             | 3005 | http://localhost:3005    |
| period-tracker | 5173 | http://localhost:5173    |

健康檢查：`GET http://localhost:8080/health`

---

## 3. 環境變數設定

### 3.1 後端環境變數 (`backend/.env`)

#### 必填變數

| 變數名 | 說明 | 取得方式 |
|--------|------|---------|
| `POSTGRES_URL` | PostgreSQL 連線字串 | GCP Cloud SQL 或 Neon Console |
| `JWT_SECRET` | JWT 簽名密鑰 | `openssl rand -base64 32` |
| `GEMINI_API_KEY` | Google Gemini API Key | https://aistudio.google.com/ |

#### LINE 相關（選填）

| 變數名 | 說明 |
|--------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |

#### AI Skill Platform（選填）

| 變數名 | 說明 |
|--------|------|
| `ADK_URL` | AI Skill Platform URL（外部 FastAPI 服務） |
| `ADK_BEARER_TOKEN` | 或 `ADK_API_KEY`，認證 token |

**說明**：
- 如果你沒有 LINE Developer 帳號：不設定 LINE 環境變數即可，前端會自動 fallback 到 Email 登入，LINE 推播功能會靜默失敗不影響其他功能。
- 如果你沒有 AI Skill Platform：系統會在 Intent 匹配失敗時跳過 AI fallback。
- `POSTGRES_URL` 必須設定，建議使用本地 Docker PostgreSQL（參考完整範例）。

#### 完整範例

```bash
# backend/.env
# 使用本地 Docker PostgreSQL（需先執行 docker-compose up -d）
POSTGRES_URL=postgresql://vitera_user:vitera_pass@localhost:5434/vitera_dev

# 或使用雲端資料庫（GCP Cloud SQL / Neon）
# POSTGRES_URL=postgresql://user:pass@your-db-host:5432/vitera

JWT_SECRET=your-32-char-secret-here
GEMINI_API_KEY=AIza...

# LINE 相關（選填）
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret

# AI Skill Platform（選填）
ADK_URL=https://your-ai-platform.run.app
ADK_BEARER_TOKEN=your-bearer-token
```

---

### 3.2 NextJS 前端 app 環境變數 (`apps/*/.env.local`)

每個 NextJS 前端 app 都需要自己的 `.env.local`。可使用腳本一次設定：

```bash
./scripts/setup-local-env.sh
```

或手動複製：

```bash
cp .env.local.example apps/portal/.env.local
cp .env.local.example apps/wounds/.env.local
cp .env.local.example apps/supplements/.env.local
cp .env.local.example apps/bones/.env.local
cp .env.local.example apps/intimacy/.env.local
cp .env.local.example apps/hq/.env.local
```

#### 前端環境變數說明

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | 後端 API URL | `http://localhost:8080` |
| `NEXT_PUBLIC_LOGIN_URL` | Portal 登入頁 URL | `http://localhost:3000/login` |
| `NEXT_PUBLIC_PORTAL_URL` | Portal 首頁 URL | `http://localhost:3000` |
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID（各 app 獨立） | 空（不啟用 LIFF） |

**LIFF ID 說明**：
- 每個 app 可以有自己的 LIFF ID（對應不同的 LINE Official Account）
- 若未設定，前端會以 browser 模式運作，使用 Email 登入
- 只有在 LINE App 內部瀏覽器開啟時，LIFF 才會啟動

---

## 4. 專案架構

### 4.1 目錄結構

```text
Vitera/
├── apps/                        # 前端 Next.js Apps（各自部署到 GCP Cloud Run）
│   ├── portal/                  # 入口頁（模組選擇、登入）           port 3000
│   ├── wounds/                  # 傷口照護                          port 3001
│   ├── supplements/             # 保健品管理                        port 3002
│   ├── bones/                   # 骨骼關節照護（拇趾外翻 AI 檢測）   port 3003
│   ├── intimacy/                # 親密健康                          port 3004
│   ├── period-tracker/          # 經期追蹤（Vite + React）         獨立部署
│   ├── women-healing-room/      # 女性療癒室                        獨立部署
│   └── hq/                      # 後台管理（模組、管理員）           port 3005
│
├── backend/                     # Fastify API Server（GCP Cloud Run）
│   ├── src/
│   │   ├── index.ts             # 入口、CORS、路由掛載
│   │   ├── lib/                 # 共用工具（db, auth, ai, adk, ...）
│   │   ├── middleware/          # authMiddleware, errorHandler
│   │   ├── routes/              # 24 個路由模組（auth, supplements, wounds, ...）
│   │   ├── controllers/         # MVC 架構 - Controllers
│   │   └── services/            # MVC 架構 - Services
│   ├── prisma/
│   │   └── schema.prisma        # Prisma ORM Schema（50+ 資料表）
│   ├── Dockerfile
│   └── .env.example
│
├── packages/
│   ├── lib/                     # @vitera/lib — 共用邏輯（Next.js 依賴）
│   │   └── src/
│   │       ├── AppLayout.jsx         # 標準 Layout（providers + auth guard）
│   │       ├── api.js                # apiFetch（帶 credentials）
│   │       ├── auth/                 # AuthProvider, AuthGuard
│   │       ├── liff/                 # LiffProvider (LINE LIFF 初始化)
│   │       └── ...
│   ├── client-auth/             # @vitera/client-auth — 框架無關認證（Vite 等）
│   │   └── src/
│   │       ├── useLiff.ts            # LIFF React Hook
│   │       └── auth.ts               # handleLiffLogin, loginWithLine
│   ├── ui/                      # @vitera/ui — 共用 React 元件
│   │   └── src/
│   │       ├── AppHeader.jsx
│   │       ├── CameraCapture.jsx
│   │       └── icons.js
│   └── utils/                   # @vitera/utils — 純工具函數
│
├── docs/                        # 開發者文件（Diátaxis 架構）
│   ├── reference/               # 技術規格（API、DB Schema、Auth Flow）
│   ├── explanation/             # 架構設計原理
│   ├── tutorials/               # 新手教學（本文件）
│   └── how-to/                  # 操作手冊
│
├── scripts/                     # 部署與工具腳本
│   ├── setup-local-env.sh       # 本機環境初始化
│   ├── deploy-backend.sh        # 後端部署到 GCP Cloud Run
│   └── deploy-frontend-cloudrun.sh  # 前端部署到 GCP Cloud Run
│
├── pnpm-workspace.yaml          # pnpm monorepo 設定
├── turbo.json                   # Turborepo pipeline 設定
└── package.json                 # monorepo root
```

### 4.2 技術棧

#### 前端
- **Next.js 15** (App Router) - 大部分 apps
- **Vite + React 19** - period-tracker（不受限框架）
- **共用套件**：`@vitera/lib`（Next.js 專用）、`@vitera/client-auth`（不受限框架）

#### 後端
- **Fastify 5** - Web 框架（取代 Hono.js）
- **Prisma ORM** - 資料庫 ORM
- **PostgreSQL** - GCP Cloud SQL（或 Neon）
- **MVC 架構** - Controller-Service 分層

#### AI & 外部服務
- **Google Gemini** - 多模型 fallback（6 個模型）
- **AI Skill Platform** - 外部 FastAPI 智能對話服務（選用）
- **LINE** - LIFF SDK、Messaging API、Bot SDK

---

## 5. Git 工作流程

### Branch 架構

```
main            ← 正式環境（Production），確認穩定後才 merge
└── staging     ← 測試環境（Staging），有 CI/CD 自動部署
    └── docs    ← 文件更新專用 branch（你目前可能在這裡）
```

### 日常開發流程

**1. 第一次加入專案時，從 staging 建立自己的 feature branch：**

```bash
git checkout staging
git pull origin staging
git checkout -b feature/your-feature-name
```

**2. 每次開工前，先同步最新的 staging：**

```bash
git checkout staging
git pull origin staging
git checkout feature/your-feature-name
git merge staging
```

**3. 開發完成後，推到自己的 branch 並發 PR 到 staging：**

```bash
git add .
git commit -m "feat: 你的功能描述"
git push origin feature/your-feature-name
# 在 GitHub 上開 Pull Request，base 選 staging
```

**4. PR merge 進 staging 後，CI/CD 會自動部署到測試環境。** 確認測試環境沒問題後，再由負責人 merge staging → main 發正式版。

### Commit Message 規範

建議使用 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` - 新功能
- `fix:` - Bug 修復
- `docs:` - 文件更新
- `refactor:` - 程式碼重構
- `test:` - 測試相關
- `chore:` - 其他雜項

### 重要規則

- ⚠️ **不要直接 push 到 `main` 或 `staging`**，一律透過 PR
- ⚠️ `staging` merge 進 `main` 前需確認測試環境功能正常
- ⚠️ PR 的 base branch 請選 `staging`，不是 `main`
- ⚠️ 避免使用 `--no-verify` 提交變更（會跳過 pre-commit hooks）

---

## 6. 常見問題

### Q1: 啟動時出現 "Module not found" 錯誤？

```bash
# 清除所有 node_modules 並重新安裝
pnpm clean
pnpm install
```

### Q2: Backend 無法連接資料庫？

**步驟 1：確認 Docker 容器運行狀態**
```bash
# 確認 Docker 容器正在運行
docker ps | grep vitera_postgres

# 如果沒有運行，啟動它
docker-compose up -d

# 檢查容器日誌
docker logs vitera_postgres
```

**步驟 2：確認環境變數設定**

在 `backend/.env` 中設定：
```bash
POSTGRES_URL=postgresql://vitera_user:vitera_pass@localhost:5434/vitera_dev
```

**步驟 3：測試資料庫連線**
```bash
# 使用 psql 測試連線（需安裝 PostgreSQL client）
psql postgresql://vitera_user:vitera_pass@localhost:5434/vitera_dev -c "SELECT version();"
```

**使用雲端資料庫（GCP Cloud SQL / Neon）**

如果使用雲端資料庫，請確認：
- 網路連線正常
- 防火牆規則允許連線
- 連線字串格式正確（參考 `backend/.env.example`）

### Q3: LIFF 初始化失敗？

本地開發時可以不設定 `NEXT_PUBLIC_LIFF_ID`，系統會 fallback 到 Email 登入模式。

### Q4: 前端無法呼叫 API？

確認：
1. Backend 已啟動（`http://localhost:8080/health` 應回傳 OK）
2. 前端 `.env.local` 中的 `NEXT_PUBLIC_API_URL=http://localhost:8080`
3. 瀏覽器 Network tab 檢查是否有 CORS 錯誤

### Q5: TypeScript 編譯錯誤？

```bash
# 清除 TypeScript 快取
pnpm turbo clean
pnpm dev
```

---

## 7. 下一步

完成本地設定後，建議閱讀：

- [架構總覽](../explanation/architecture-overview.md) - 理解系統設計
- [API 端點參考](../reference/api-endpoints.md) - 查閱所有 API
- [認證流程說明](../reference/auth-flow.md) - 了解 LIFF 與 Email 登入機制

祝開發順利！🚀
