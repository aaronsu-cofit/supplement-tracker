# Vitera Backend 部署檢查清單

**版本:** 0.2.0 (Fastify MVC)
**日期:** 2026-05-11
**目標環境:** GCP Cloud Run (生產) | 本地/Staging

---

## 📋 目錄

1. [前置準備](#前置準備)
2. [環境變量配置](#環境變量配置)
3. [代碼準備](#代碼準備)
4. [數據庫準備](#數據庫準備)
5. [測試驗證](#測試驗證)
6. [部署執行](#部署執行)
7. [部署後驗證](#部署後驗證)
8. [監控設置](#監控設置)
9. [回滾計劃](#回滾計劃)
10. [驗收標準](#驗收標準)

---

## 前置準備

### ✅ 系統要求

#### 開發/Staging 環境

- [ ] **Node.js** >= 20.0.0
- [ ] **pnpm** >= 9.0.0
- [ ] **PostgreSQL** >= 14.0
- [ ] **Docker** (可選，用於本地 PostgreSQL)

```bash
# 檢查版本
node --version   # v20.x.x
pnpm --version   # 9.x.x
psql --version   # 14.x
```

#### 生產環境 (GCP Cloud Run)

- [ ] **GCP 項目** 已創建
- [ ] **Cloud SQL (PostgreSQL)** 實例已配置
- [ ] **Cloud Run** 服務已創建
- [ ] **Artifact Registry** 已啟用
- [ ] **IAM 權限** 已正確設置

### ✅ 訪問權限確認

- [ ] GCP 項目管理員權限
- [ ] Cloud SQL 數據庫訪問權限
- [ ] Cloud Run 部署權限
- [ ] Artifact Registry 推送權限
- [ ] Secret Manager 訪問權限 (存儲敏感配置)

### ✅ 必要工具安裝

```bash
# 安裝 GCP CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# 認證
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Docker (用於構建容器)
docker --version
```

---

## 環境變量配置

### ✅ 環境變量清單

創建 `.env.production` 文件 (或使用 GCP Secret Manager):

```env
# ─── 應用配置 ─────────────────────────────────────────
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# ─── 數據庫配置 ─────────────────────────────────────────
DATABASE_URL=postgresql://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE

# ─── JWT 配置 ─────────────────────────────────────────
JWT_SECRET=your-production-jwt-secret-min-32-characters
JWT_EXPIRES_IN=7d

# ─── Cookie 配置 ─────────────────────────────────────────
COOKIE_SECRET=your-production-cookie-secret-min-32-characters

# ─── CORS 配置 ─────────────────────────────────────────
ALLOWED_ORIGINS=https://app.vitera.com,https://admin.vitera.com

# ─── LINE 配置 ─────────────────────────────────────────
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token

# ─── Google Gemini API ─────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key

# ─── 日誌配置 ─────────────────────────────────────────
LOG_LEVEL=info

# ─── 其他配置 ─────────────────────────────────────────
ADMIN_EMAIL=admin@vitera.com
ADMIN_PASSWORD=secure-admin-password
```

### ✅ 環境變量檢查清單

- [ ] `NODE_ENV` 設為 `production`
- [ ] `DATABASE_URL` 使用生產環境數據庫
- [ ] `JWT_SECRET` 是強隨機密鑰 (>= 32 字符)
- [ ] `COOKIE_SECRET` 是強隨機密鑰 (>= 32 字符)
- [ ] `ALLOWED_ORIGINS` 只包含生產域名
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` 已更新
- [ ] `GEMINI_API_KEY` 已配額限制
- [ ] 所有敏感信息已使用 Secret Manager

### ✅ 生成安全密鑰

```bash
# 生成 JWT_SECRET (32 字節)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 COOKIE_SECRET (32 字節)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 代碼準備

### ✅ 代碼完整性檢查

#### Step 1: 拉取最新代碼

```bash
git fetch origin
git checkout main
git pull origin main
```

#### Step 2: 檢查代碼狀態

```bash
# 確保沒有未提交的更改
git status

# 確認分支
git branch --show-current  # 應該是 main 或 release
```

#### Step 3: 安裝依賴

```bash
cd /path/to/Vitera/backend
pnpm install --frozen-lockfile
```

**檢查清單:**
- [ ] 代碼已合併到 main 分支
- [ ] 沒有未解決的合併衝突
- [ ] `package.json` 和 `pnpm-lock.yaml` 同步
- [ ] 所有依賴安裝成功

### ✅ 編譯檢查

```bash
# TypeScript 編譯
pnpm run build

# 檢查編譯輸出
ls -la dist/

# 預期結果:
# dist/
# ├── fastify-app.js
# ├── index.js
# ├── controllers/
# ├── services/
# ├── routes/
# └── ...
```

**檢查清單:**
- [ ] TypeScript 編譯無錯誤
- [ ] `dist/` 目錄生成成功
- [ ] 所有模塊正確解析
- [ ] 沒有 TypeScript 類型錯誤

### ✅ 代碼質量檢查

```bash
# Lint 檢查 (如果配置了 ESLint)
pnpm run lint

# 格式化檢查 (如果配置了 Prettier)
pnpm run format:check
```

---

## 數據庫準備

### ✅ 數據庫連接測試

```bash
# 本地測試連接
psql $DATABASE_URL -c "SELECT version();"

# 或使用 Prisma
pnpm prisma db execute --url=$DATABASE_URL --stdin <<< "SELECT version();"
```

### ✅ 數據庫備份 (生產環境)

**⚠️ 重要: 部署前必須備份！**

#### GCP Cloud SQL 自動備份

```bash
# 檢查自動備份狀態
gcloud sql backups list --instance=YOUR_INSTANCE_NAME

# 手動創建備份
gcloud sql backups create \
  --instance=YOUR_INSTANCE_NAME \
  --description="Pre-Fastify-MVC-Deployment-$(date +%Y%m%d-%H%M%S)"
```

#### 手動 SQL 導出

```bash
# 導出整個數據庫
gcloud sql export sql YOUR_INSTANCE_NAME gs://YOUR_BUCKET/backup-$(date +%Y%m%d).sql \
  --database=YOUR_DATABASE_NAME
```

**檢查清單:**
- [ ] 數據庫自動備份已啟用
- [ ] 手動備份已創建 (部署前)
- [ ] 備份文件已驗證完整性
- [ ] 備份保留時間 >= 7 天

### ✅ 數據庫遷移

#### Staging 環境測試

```bash
# 設置 Staging 數據庫連接
export DATABASE_URL="postgresql://..."

# 運行遷移 (乾跑)
pnpm prisma migrate deploy --preview-feature

# 確認無錯誤後，正式運行
pnpm prisma migrate deploy
```

#### 生產環境遷移

```bash
# ⚠️ 生產環境遷移前必須確認！
export DATABASE_URL="postgresql://production..."

# 運行 Prisma 遷移
pnpm prisma migrate deploy

# 驗證遷移結果
pnpm prisma db seed  # 如果需要種子數據
```

**檢查清單:**
- [ ] 遷移腳本已在 Staging 測試
- [ ] 所有遷移腳本無錯誤
- [ ] 數據庫 Schema 已更新
- [ ] Prisma Client 已重新生成

---

## 測試驗證

### ✅ 單元測試

```bash
cd /path/to/Vitera/backend

# 運行所有單元測試
pnpm test

# 檢查測試覆蓋率
pnpm test -- --coverage
```

**預期結果:**
- ✅ 所有測試通過 (0 failed)
- ✅ 測試覆蓋率 > 80%

**檢查清單:**
- [ ] 27+ 測試套件全部通過
- [ ] Service 層測試覆蓋率 > 85%
- [ ] Controller 層測試覆蓋率 > 80%

### ✅ 端點驗證 (本地/Staging)

```bash
# 啟動服務器
node dist/fastify-app.js &
SERVER_PID=$!

# 等待服務器啟動
sleep 3

# 運行端點驗證腳本
bash scripts/verify-endpoints.sh

# 停止服務器
kill $SERVER_PID
```

**檢查清單:**
- [ ] 健康檢查端點正常 (`GET /health`)
- [ ] 認證端點正常
- [ ] 所有業務端點響應正確
- [ ] 端點驗證通過率 100%

### ✅ 性能測試 (可選但推薦)

```bash
# 啟動服務器
node dist/fastify-app.js &
SERVER_PID=$!

# 運行性能測試
bash scripts/benchmark-performance.sh

# 停止服務器
kill $SERVER_PID
```

**檢查清單:**
- [ ] P50 響應時間 < 100ms
- [ ] P95 響應時間 < 300ms
- [ ] 吞吐量 > 1000 req/s
- [ ] 無內存洩漏

### ✅ 集成測試 (Staging 環境)

```bash
# 部署到 Staging
# ... (部署步驟)

# 運行集成測試
pnpm test:integration

# 或手動驗證關鍵流程
curl https://staging.vitera.com/health
curl -X POST https://staging.vitera.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## 部署執行

### ✅ 構建 Docker 鏡像

#### Step 1: 創建 Dockerfile (已存在)

```dockerfile
# /path/to/Vitera/backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
```

#### Step 2: 構建鏡像

```bash
cd /path/to/Vitera/backend

# 構建 Docker 鏡像
docker build -t gcr.io/YOUR_PROJECT_ID/vitera-backend:0.2.0 .

# 標記為 latest
docker tag gcr.io/YOUR_PROJECT_ID/vitera-backend:0.2.0 \
           gcr.io/YOUR_PROJECT_ID/vitera-backend:latest
```

#### Step 3: 推送鏡像到 GCP Artifact Registry

```bash
# 配置 Docker 認證
gcloud auth configure-docker

# 推送鏡像
docker push gcr.io/YOUR_PROJECT_ID/vitera-backend:0.2.0
docker push gcr.io/YOUR_PROJECT_ID/vitera-backend:latest
```

**檢查清單:**
- [ ] Docker 鏡像構建成功
- [ ] 鏡像大小合理 (< 500MB)
- [ ] 鏡像已推送到 Artifact Registry
- [ ] 鏡像標籤正確 (版本號 + latest)

### ✅ 部署到 GCP Cloud Run

#### Step 1: 部署服務

```bash
# 部署到 Cloud Run
gcloud run deploy vitera-backend \
  --image gcr.io/YOUR_PROJECT_ID/vitera-backend:0.2.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 1 \
  --port 8080 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=vitera-db-url:latest,JWT_SECRET=vitera-jwt-secret:latest \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:YOUR_INSTANCE_NAME
```

#### Step 2: 設置自定義域名 (可選)

```bash
# 映射域名
gcloud run domain-mappings create \
  --service vitera-backend \
  --domain api.vitera.com \
  --region us-central1
```

**檢查清單:**
- [ ] Cloud Run 服務部署成功
- [ ] 服務 URL 可訪問
- [ ] Cloud SQL 連接正常
- [ ] 環境變量正確注入
- [ ] Secret Manager 配置生效

### ✅ 驗證部署

```bash
# 獲取服務 URL
SERVICE_URL=$(gcloud run services describe vitera-backend \
  --region us-central1 \
  --format 'value(status.url)')

echo "Service URL: $SERVICE_URL"

# 健康檢查
curl $SERVICE_URL/health

# 預期響應:
# {
#   "status": "ok",
#   "timestamp": "2026-05-11T10:30:00Z",
#   "framework": "fastify"
# }
```

---

## 部署後驗證

### ✅ 功能驗證

#### 健康檢查

```bash
curl https://api.vitera.com/health
```

**預期響應:** `{ "status": "ok", "framework": "fastify" }`

#### 認證流程

```bash
# 登入
curl -X POST https://api.vitera.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 預期: 返回 token 和用戶資料
```

#### 業務端點

```bash
# 測試補充品端點
curl -X GET https://api.vitera.com/api/supplements \
  -H "Authorization: Bearer YOUR_TOKEN"

# 測試傷口管理端點
curl -X GET https://api.vitera.com/api/wounds \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**檢查清單:**
- [ ] 健康檢查返回 200
- [ ] 登入端點正常工作
- [ ] JWT token 正確生成
- [ ] Cookie 正確設置
- [ ] 業務端點響應正確
- [ ] 數據庫讀寫正常
- [ ] 外部 API 調用成功 (LINE, Gemini)

### ✅ 性能驗證

```bash
# 使用 wrk 進行壓力測試
wrk -t4 -c100 -d30s https://api.vitera.com/health

# 預期:
# Latency P50 < 100ms
# Latency P95 < 300ms
# Requests/sec > 1000
```

**檢查清單:**
- [ ] 響應時間符合預期
- [ ] 吞吐量符合預期
- [ ] 無明顯錯誤率上升
- [ ] 內存使用穩定

### ✅ 錯誤處理驗證

```bash
# 測試 404
curl https://api.vitera.com/api/nonexistent

# 測試 401
curl https://api.vitera.com/api/supplements  # 無 token

# 測試 400
curl -X POST https://api.vitera.com/api/supplements \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'
```

**檢查清單:**
- [ ] 404 錯誤格式正確
- [ ] 401 未授權響應正確
- [ ] 400 驗證錯誤詳細
- [ ] 500 錯誤被正確捕獲

---

## 監控設置

### ✅ GCP Cloud Monitoring

#### 設置告警

```bash
# 創建告警策略 (響應時間)
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Vitera Backend - High Latency" \
  --condition-display-name="Response time > 500ms" \
  --condition-threshold-value=500 \
  --condition-threshold-duration=60s
```

#### 關鍵指標監控

- [ ] **響應時間 (Latency)**
  - P50 < 100ms
  - P95 < 300ms
  - P99 < 500ms

- [ ] **錯誤率 (Error Rate)**
  - 4xx 錯誤率 < 5%
  - 5xx 錯誤率 < 1%

- [ ] **吞吐量 (Throughput)**
  - Requests/second
  - 趨勢監控

- [ ] **資源使用**
  - CPU 使用率 < 80%
  - 內存使用率 < 80%
  - 實例數量

### ✅ 日誌聚合

```bash
# 查看 Cloud Run 日誌
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vitera-backend" \
  --limit 50 \
  --format json

# 設置日誌過濾器 (只看錯誤)
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit 20
```

**檢查清單:**
- [ ] 日誌正常輸出到 Cloud Logging
- [ ] ERROR 級別日誌有告警
- [ ] 日誌保留期 >= 30 天
- [ ] 敏感信息已脫敏

### ✅ 健康檢查配置

```bash
# Cloud Run 自動健康檢查配置
# 在部署時已自動設置，驗證:
gcloud run services describe vitera-backend \
  --region us-central1 \
  --format="get(spec.template.spec.containers[0].livenessProbe)"
```

---

## 回滾計劃

### ✅ 快速回滾 (推薦)

#### 回滾到上一個版本

```bash
# 列出所有版本
gcloud run revisions list \
  --service vitera-backend \
  --region us-central1

# 回滾到指定版本
gcloud run services update-traffic vitera-backend \
  --to-revisions PREVIOUS_REVISION=100 \
  --region us-central1
```

#### 驗證回滾成功

```bash
# 健康檢查
curl https://api.vitera.com/health

# 檢查當前版本
gcloud run services describe vitera-backend \
  --region us-central1 \
  --format="value(status.latestReadyRevisionName)"
```

### ✅ 數據庫回滾

**⚠️ 數據庫回滾需謹慎！**

#### 恢復備份

```bash
# 從 Cloud SQL 備份恢復
gcloud sql backups restore BACKUP_ID \
  --backup-instance=SOURCE_INSTANCE \
  --restore-instance=TARGET_INSTANCE

# 驗證數據
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

**檢查清單:**
- [ ] 備份文件完整
- [ ] 恢復命令已測試 (Staging)
- [ ] 恢復時間可接受 (< 30 分鐘)
- [ ] 數據完整性驗證通過

### ✅ 回滾決策標準

**立即回滾的情況:**
- ❌ 健康檢查失敗 (> 5 分鐘)
- ❌ 5xx 錯誤率 > 10%
- ❌ 關鍵業務功能不可用
- ❌ 數據丟失或損壞

**觀察後再決定:**
- ⚠️ 響應時間略微上升 (< 2x)
- ⚠️ 4xx 錯誤率略微上升 (< 10%)
- ⚠️ 非關鍵功能異常

---

## 驗收標準

### ✅ 功能完整性

- [ ] 所有 18 個路由模塊正常工作
- [ ] 100+ API 端點全部可訪問
- [ ] 認證流程完整 (登入/登出/LINE)
- [ ] 數據庫 CRUD 操作正常
- [ ] 外部 API 調用成功 (LINE, Gemini)

### ✅ 性能指標

- [ ] P50 響應時間 < 100ms
- [ ] P95 響應時間 < 300ms
- [ ] 吞吐量 > 1000 req/s
- [ ] 錯誤率 < 1%
- [ ] CPU 使用率 < 80%
- [ ] 內存使用率 < 80%

### ✅ 安全性

- [ ] HTTPS 強制啟用
- [ ] JWT token 正確驗證
- [ ] CORS 配置正確
- [ ] SQL 注入防護生效
- [ ] 敏感信息已加密

### ✅ 可觀測性

- [ ] 日誌正常輸出
- [ ] 監控告警已設置
- [ ] 健康檢查端點正常
- [ ] 錯誤追蹤可用

### ✅ 文檔完整性

- [ ] API 文檔更新
- [ ] 架構文檔更新
- [ ] 部署文檔更新 (本文檔)
- [ ] README 更新

---

## 部署後任務

### ✅ 通知相關方

- [ ] 通知開發團隊部署成功
- [ ] 通知 QA 團隊進行驗證測試
- [ ] 通知產品團隊新版本上線
- [ ] 更新項目管理工具狀態

### ✅ 文檔更新

- [ ] 更新版本號到 0.2.0
- [ ] 更新 CHANGELOG.md
- [ ] 標記 Git tag: `v0.2.0`

```bash
git tag -a v0.2.0 -m "Fastify MVC Architecture Release"
git push origin v0.2.0
```

### ✅ 監控觀察期

**前 24 小時:**
- 每 2 小時檢查監控指標
- 查看錯誤日誌
- 檢查用戶反饋

**前 7 天:**
- 每日檢查監控報告
- 分析性能趨勢
- 收集用戶反饋

### ✅ 清理舊版本 (7 天後)

```bash
# 刪除舊的 Cloud Run 版本 (保留最近 3 個)
gcloud run revisions list \
  --service vitera-backend \
  --region us-central1 \
  --sort-by="~createdTimestamp" \
  --limit 10

# 手動刪除舊版本
gcloud run revisions delete OLD_REVISION_NAME \
  --region us-central1 \
  --quiet
```

---

## 緊急聯絡

### 支援團隊

- **技術負責人:** [姓名] - [電話] - [Email]
- **DevOps 工程師:** [姓名] - [電話] - [Email]
- **數據庫管理員:** [姓名] - [電話] - [Email]

### 緊急響應流程

1. **發現問題** → 立即通知技術負責人
2. **評估嚴重性** → 決定是否回滾
3. **執行回滾** (如需要)
4. **問題分析** → 記錄根本原因
5. **修復計劃** → 制定下次部署計劃

---

## 總結

### 部署前核心檢查清單

- [ ] ✅ 代碼已編譯成功
- [ ] ✅ 所有測試通過
- [ ] ✅ 數據庫已備份
- [ ] ✅ 環境變量已配置
- [ ] ✅ Docker 鏡像已構建
- [ ] ✅ Staging 環境驗證通過

### 部署中核心步驟

1. 構建 Docker 鏡像
2. 推送到 Artifact Registry
3. 部署到 Cloud Run
4. 驗證健康檢查
5. 驗證關鍵業務流程

### 部署後核心驗證

- [ ] ✅ 健康檢查正常
- [ ] ✅ 關鍵業務流程正常
- [ ] ✅ 性能指標達標
- [ ] ✅ 監控告警已設置
- [ ] ✅ 回滾計劃已就緒

---

**文檔編制:** Claude (Vitera DevOps 工程師)
**最後更新:** 2026-05-11
**版本:** 1.0.0
