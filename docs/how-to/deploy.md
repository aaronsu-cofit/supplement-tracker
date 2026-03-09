# Deployment Guide

本指南說明如何將 Vitera 專案部署上正式環境。後端部署至 **Cloud Run**，前端部署至 **Vercel**。

---

## 1. 後端 (Cloud Run) 部署

後端使用 **Prisma ORM**，部署時需特別注意 migration 流程。

### 環境變數 (Cloud Run Secret / Env Vars)

| 變數 | 說明 |
|---|---|
| `POSTGRES_URL` | Supabase / Neon PostgreSQL connection string |
| `JWT_SECRET` | JWT 簽名金鑰 |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API token |
| `LINE_CHANNEL_SECRET` | LINE Messaging API secret |
| `ALLOWED_ORIGINS` | 前端 origin 白名單，逗號分隔 |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

> **注意**：`POSTGRES_URL` 必須使用 **non-pooling** connection string（Supabase 的 URI 要選 `Session mode` 或 Direct connection），因為 `prisma migrate deploy` 需要直連。若使用 Supabase，避免用 PgBouncer pooler URL 給 migrate 用。

### Dockerfile 說明

`backend/Dockerfile` 已更新為：

1. 先 `COPY prisma ./prisma`，讓 `pnpm install` 的 `postinstall` hook 能執行 `prisma generate`（產生 Prisma Client）
2. `CMD` 改為 `prisma migrate deploy && node src/index.js`，每次 container 啟動時自動套用未執行的 migration

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

### 部署步驟

```bash
# 1. Build image
docker build -t gcr.io/<PROJECT_ID>/vitera-backend:latest ./backend

# 2. Push
docker push gcr.io/<PROJECT_ID>/vitera-backend:latest

# 3. Deploy to Cloud Run
gcloud run deploy vitera-backend \
  --image gcr.io/<PROJECT_ID>/vitera-backend:latest \
  --region asia-east1 \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-secrets POSTGRES_URL=POSTGRES_URL:latest,JWT_SECRET=JWT_SECRET:latest,...
```

或直接透過 Cloud Run MCP 工具部署（見 `mcp_cloudrun_deploy_local_folder`）。

---

## 2. Local 接 Staging DB (GCP Cloud SQL)

如果你想讓本機後端直接打 staging 的 GCP PostgreSQL（例如測試 migration 或 debug staging 資料），使用 **Cloud SQL Auth Proxy**：

### 安裝 Proxy

```bash
# macOS
brew install cloud-sql-proxy
```

### 啟動 Proxy

```bash
# INSTANCE_CONNECTION_NAME 格式：<PROJECT_ID>:<REGION>:<INSTANCE_ID>
# 可以在 GCP Console → Cloud SQL → 你的 instance → Overview 找到
cloud-sql-proxy <PROJECT_ID>:<REGION>:<INSTANCE_ID> --port 5433
```

Proxy 會在 `127.0.0.1:5433` 監聽，不需要 allowlisting IP 或 SSL cert。

### 設定 .env

```bash
# backend/.env (local 接 staging 時暫時換成這個)
POSTGRES_URL=postgresql://USER:PASS@127.0.0.1:5433/vitera_staging
```

> 記得跑完後切回 local DB，避免不小心改到 staging 資料。

### 套用 Migration 到 Staging

```bash
# Proxy 開著的情況下
pnpm --filter @vitera/backend db:deploy   # prisma migrate deploy
```

---

## 3. 本機 DB Migration 流程

```bash
# 開發中修改 schema 後：
pnpm --filter @vitera/backend db:migrate   # prisma migrate dev（建立 migration file）

# 推到已存在的 DB（不建立 migration history，適合快速 prototype）：
pnpm --filter @vitera/backend db:push      # prisma db push

# 正式環境套用 migrations：
pnpm --filter @vitera/backend db:deploy    # prisma migrate deploy
```

---

## 3. 前端 (Vercel) 部署

Vercel 自動 deploy（push to main branch）。

### 環境變數 (Vercel)

各 app 的 Vercel 專案需設定對應的 env vars：

| 變數 | 說明 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 後端 Cloud Run URL（e.g. `https://vitera-backend-xxx.run.app`） |
| `NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS` | LINE LIFF ID |
| `NEXT_PUBLIC_LIFF_ID_WOUNDS` | LINE LIFF ID（選填） |
| `JWT_SECRET` | 若前端有 route handler 需驗 JWT |

### Build 設定

- **Framework**：Next.js（自動偵測）
- **Build Command**：`next build`（或 turborepo `turbo build --filter=@vitera/<app-name>`）
- **Root Directory**：`apps/<app-name>`（e.g. `apps/hq`）

---

## 4. 部署後驗證清單 (Post-Deployment Checklist)

- [ ] (Auth) 開啟首頁，能導向 `/login`
- [ ] (Auth) 網頁版能成功登入 / 註冊 Email 帳號
- [ ] (Auth) LINE LIFF 環境能無縫登入
- [ ] (Wounds) 上傳傷口照片，AI 分析不逾時
- [ ] (Wounds) 建立成功後顯示在 `/wounds/history`
- [ ] (Notify) AI 分析完成後 LINE 推播正常收到
- [ ] (DB) Cloud Run log 無 `prisma migrate deploy` 錯誤

---

## 5. Serverless 考量

- **Vercel**：Request Body 上限 4.5 MB → 前端圖片需 Canvas 壓縮至 800px / 70% quality
- **Cloud Run**：Prisma migrate deploy 在 cold start 時執行，若 migration 多可能略增啟動時間；可考慮把 migrate 改為 CI/CD pipeline step 而非 CMD
- **Supabase / Neon**：idle 後首次連線有 1~2 秒延遲，前端 loading state 已足夠應付
