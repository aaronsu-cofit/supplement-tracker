# Vitera

**Vitera** 是 [Cofit](https://cofit.health) 旗下的醫療 DTX 工具平台，專為 B2B2C 場景設計。

醫師（骨科、婦產科、外科等）透過 Vitera 平台選擇並指派數位健康小工具給病患，病患透過 LINE LIFF 使用，無需下載 App。

---

## 服務一覽

| App | 說明 | 本機 Port |
|---|---|---|
| `apps/portal` | 病患入口（模組導航、登入） | 3000 |
| `apps/wounds` | 傷口智慧追蹤 | 3001 |
| `apps/bones` | 骨骼關節照護（AI 拇趾外翻檢測） | 3003 |
| `apps/intimacy` | 親密健康評估 | 3004 |
| `apps/hq` | 後台管理（模組、管理員） | 3005 |
| `backend` | Hono.js API（GCP Cloud Run） | 8080 |

---

## LINE OA 與 LIFF 連結

### LINE Official Account

| 環境 | 名稱 | 連結 |
|---|---|---|
| Staging | Cofit 骨關節學院 | https://lin.ee/WCxlyjF |
| Staging |  Cofit 傷口照護 | https://lin.ee/K2NScRu |

### LIFF 連結

#### Staging

| App | LIFF URL |
|---|---|
| Portal | https://liff.line.me/2009369966-6Ly7P5hr|
| Wounds | https://liff.line.me/2009369966-8j4V79oc |
| Bones | https://liff.line.me/2009369966-O9ki4KMZ |
| Intimacy | https://liff.line.me/2009369966-W1nfvsJr |

<!-- #### Production

| App | LIFF URL |
|---|---|
| Portal | |
| Wounds |  |
| Bones |  |
| Intimacy |  | 
-->

---

## Staging 環境

PR merge 進 `staging` branch 後，CI/CD 自動部署，約 3 分鐘後生效。

| 服務 | Staging URL |
|---|---|
| Portal | https://vitera-portal-staging.cofit.me |
| Wounds | https://vitera-wounds-staging.cofit.me |
| Bones | https://vitera-bones-staging.cofit.me |
| Intimacy | https://vitera-intimacy-staging.cofit.me |
| HQ（後台） | https://vitera-hq-staging.cofit.me |
| Backend API | https://vitera-api-staging.cofit.me |

### 如何存取 Staging 網站

- **Portal / Wounds / Bones / Supplements / Intimacy**：透過 LINE LIFF 開啟，需在 LINE 內開啟對應的 LIFF URL（由 LINE 開發者後台設定），登入後依模組導引進入各子應用。
- **HQ（後台管理）**：直接在瀏覽器開啟 https://vitera-hq-staging.cofit.me，使用**管理員帳號**密碼登入（不走 LINE LIFF）。
  - ⚠️ **權限要求**：只有 `admin` 或 `superadmin` 角色的用戶才能存取 HQ 後台。普通患者帳號（`user` 角色）會被拒絕存取。
- **Backend API**：REST API，可透過 curl / Postman 等工具測試，Cookie-based auth（需先透過 Portal 取得 session）。

> ⚠️ Staging 子應用的 auth cookie domain 為 `.cofit.me`，請確保瀏覽器允許跨子域 cookie。

---

## 本機開發

### 前置需求

- **Node.js** 20+
- **pnpm** 9.15.0（`npm install -g pnpm@9.15.0`）
- **Docker & Docker Compose**（推薦用 Docker Desktop）或自行安裝 PostgreSQL
- LINE LIFF ID（選填，本機測試可不設）

### 安裝依賴

```bash
pnpm install
```

### 啟動本地資料庫

使用 Docker Compose 快速啟動 PostgreSQL（Port: 5434）：

```bash
# 啟動資料庫容器
docker compose up -d

# 檢查狀態（應該看到 vitera_postgres 運行中）
docker compose ps
```

> 💾 資料會持久化在 Docker volume 中，容器關閉後資料不會遺失。
> 🛑 要停止容器：`docker compose down`
> 📌 如果 5434 port 已佔用，可編輯 `docker-compose.yml` 改用其他 port

### 環境變數設定

```bash
# 後端環境變數（Docker Compose 連線已在 .env.example 中設定）
cp backend/.env.example backend/.env
# 編輯 backend/.env，填入 JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN 等其他必要欄位

# 前端本機環境變數（互動式，一次設定全部 app）
./scripts/setup-local-env.sh
# 或手動複製並編輯各 app 的 .env.local
```

本機前端預設連後端 `http://localhost:8080`，完整預設值見 `.env.local.example`。

### 初始化資料庫架構

```bash
# 首次初始化：建立初始 migration 並應用
pnpm db:migrate -- --name init

# 或推送最新 schema（無 migration 記錄，快速迭代用）
pnpm db:push
```

> 建議用 `pnpm db:migrate` 建立初始 migration，這樣團隊成員和 CI/CD 可以用 `pnpm db:deploy` 統一應用。

### 啟動開發伺服器

建議只啟動需要的模組，減少資源消耗：

```bash
pnpm dev:wounds      # wounds + portal + backend
pnpm dev:bones       # bones + portal + backend
pnpm dev:intimacy    # intimacy + portal + backend
pnpm dev:hq          # hq + backend
pnpm dev:portal      # portal + backend
pnpm dev             # 啟動全部（較耗資源）
```

### 資料庫操作

> ⚠️ **前提**：確保已執行 `docker compose up -d` 啟動資料庫

```bash
pnpm db:migrate   # 建立新 migration（開發用）
pnpm db:push      # 直接 push schema（快速迭代用，不建立 migration）
pnpm db:deploy    # 套用所有 pending migration（CI/CD 或部署前用）
pnpm db:studio    # 開啟 Prisma Studio（視覺化 DB 介面，瀏覽器訪問 http://localhost:5555）
```

---

## 建置與部署

### Docker 建置（單一 App）

每個 app 都有獨立的 Dockerfile，支援以下 build args：

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://vitera-api-staging.cofit.me \
  --build-arg NEXT_PUBLIC_LOGIN_URL=https://vitera-portal-staging.cofit.me/login \
  --build-arg NEXT_PUBLIC_LIFF_ID=your-liff-id \
  -t vitera-wounds:local \
  -f apps/wounds/Dockerfile .
```

> Dockerfile 使用 multi-stage build（base → deps → builder → runner），最終 image 基於 Node 20-alpine + Next.js standalone 輸出，啟動 port 為 **8080**。

### CI/CD 自動部署（GCP Cloud Run）

push 到 `staging` branch 時，GitHub Actions 自動觸發對應 workflow：

| Workflow | 觸發路徑 | 部署目標 |
|---|---|---|
| `portal-staging-cicd.yml` | `apps/portal/**` | GCP Cloud Run |
| `wounds-staging-cicd.yml` | `apps/wounds/**` | GCP Cloud Run |
| `bones-staging-cicd.yml` | `apps/bones/**` | GCP Cloud Run |
| `intimacy-staging-cicd.yml` | `apps/intimacy/**` | GCP Cloud Run |
| `hq-staging-cicd.yml` | `apps/hq/**` | GCP Cloud Run |
| `backend-staging-cicd.yml` | `backend/**` | GCP Cloud Run + DB migration |


---

## Git 工作流程

```
main            ← 正式環境（Production），穩定後才 merge
└── staging     ← 測試環境（Staging），CI/CD 自動部署，日常主要在這裡整合
    ├── aaron_develop
    ├── bob_develop
    └── yourname_develop   ← 每位開發者自己的 branch
```

1. 從 `staging` 建立自己的 branch：
   ```bash
   git checkout staging && git pull origin staging
   git checkout -b yourname_develop
   ```

2. 每次開工前同步 `staging`：
   ```bash
   git checkout staging && git pull origin staging
   git checkout yourname_develop && git merge staging
   ```

3. 開發完成後推 branch，在 GitHub 開 PR，base 選 **`staging`**（不是 `main`）。

4. PR merge 後，CI/CD 自動部署到 staging 環境。

> 不要直接 push 到 `main` 或 `staging`，一律透過 PR。

---

## 技術棧

- **Frontend**: Next.js 16 · React 19 · Tailwind CSS v4 · pnpm Workspaces · Turborepo
- **Backend**: Hono.js · Node 20
- **Database**: GCP Cloud SQL (PostgreSQL) · Prisma ORM
- **Infrastructure**: GCP Cloud Run · Docker · ArgoCD (GitOps) · GitHub Actions
- **AI**: Google Gemini（圖像分析）
- **通訊**: LINE LIFF · LINE Bot SDK
- **Packages**: `@vitera/lib`（共用邏輯）· `@vitera/ui`（共用元件）
