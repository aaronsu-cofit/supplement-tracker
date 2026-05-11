# Vitera Backend 快速開始指南

**⏱️ 預計時間:** 5-10 分鐘
**版本:** 0.2.0 (Fastify MVC)

---

## 🎯 快速開始 (5 分鐘)

### Step 1: 克隆並安裝 (2 分鐘)

```bash
# 進入後端目錄
cd /Users/chingchingyeh/cofit/dtx-space/Vitera/backend

# 安裝依賴
pnpm install
```

### Step 2: 配置環境 (1 分鐘)

```bash
# 複製環境變量範例
cp .env.example .env

# 編輯 .env (最小配置)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/vitera
# JWT_SECRET=your-dev-secret-at-least-32-characters
# COOKIE_SECRET=your-cookie-secret-at-least-32-characters
```

### Step 3: 啟動數據庫 (1 分鐘)

```bash
# 使用 Docker (在項目根目錄)
cd ..
docker-compose up -d

# 回到 backend
cd backend

# 初始化數據庫
pnpm db:push
```

### Step 4: 啟動服務器 (1 分鐘)

```bash
# 開發模式啟動
pnpm dev

# 看到以下信息表示成功:
# Server listening at http://localhost:8081
```

### Step 5: 驗證安裝 (30 秒)

```bash
# 健康檢查
curl http://localhost:8081/health

# 預期響應:
# {
#   "status": "ok",
#   "timestamp": "2026-05-11T10:30:00Z",
#   "framework": "fastify"
# }
```

**🎉 恭喜！你的 Vitera Backend 已經運行起來了！**

---

## 📝 詳細步驟

### 環境準備

#### 必需軟件

```bash
# 檢查 Node.js 版本 (需要 >= 20)
node --version

# 檢查 pnpm 版本 (需要 >= 9)
pnpm --version

# 如果沒有 pnpm, 安裝它
npm install -g pnpm
```

#### 安裝 Docker (可選)

如果沒有本地 PostgreSQL,建議使用 Docker:

```bash
# macOS
brew install --cask docker

# 啟動 Docker Desktop
# 驗證安裝
docker --version
```

### 數據庫設置

#### 選項 A: Docker (推薦)

```bash
# 在 Vitera 根目錄
cd /Users/chingchingyeh/cofit/dtx-space/Vitera
docker-compose up -d

# 驗證 PostgreSQL 運行
docker ps | grep postgres

# DATABASE_URL 使用:
# postgresql://postgres:postgres@localhost:5433/vitera
```

#### 選項 B: 本地 PostgreSQL

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# 創建數據庫
createdb vitera

# DATABASE_URL 使用:
# postgresql://localhost/vitera
```

### 初始化數據庫

```bash
cd backend

# 運行 Prisma 遷移
pnpm db:push

# (可選) 填充測試數據
pnpm db:seed

# 打開 Prisma Studio 查看數據
pnpm db:studio
# 訪問 http://localhost:5555
```

---

## 🧪 測試 API

### 健康檢查

```bash
curl http://localhost:8081/health
```

### 用戶註冊

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'
```

### 用戶登入

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'

# 保存返回的 token
export TOKEN="返回的_token_值"
```

### 獲取補充品列表

```bash
curl -X GET http://localhost:8081/api/supplements \
  -H "Authorization: Bearer $TOKEN"
```

### 創建補充品

```bash
curl -X POST http://localhost:8081/api/supplements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Vitamin C",
    "dosage": "1000mg",
    "frequency": 1,
    "notes": "每日早餐後服用"
  }'
```

---

## 🔧 開發工作流

### 1. 日常開發

```bash
# 啟動開發服務器 (熱重載)
pnpm dev

# 修改代碼後自動重啟
# 修改 src/services/supplements.service.ts
# 保存後自動重新加載
```

### 2. 運行測試

```bash
# 運行所有測試
pnpm test

# 監聽模式 (推薦開發時使用)
pnpm test:watch

# 測試覆蓋率
pnpm test -- --coverage
```

### 3. 檢查代碼質量

```bash
# TypeScript 編譯檢查
pnpm build

# 檢查編譯輸出
ls -la dist/
```

### 4. 數據庫操作

```bash
# 打開 Prisma Studio (數據庫 GUI)
pnpm db:studio

# 修改 Schema 後同步
pnpm db:push

# 重新生成 Prisma Client
pnpm prisma generate
```

---

## 🐛 常見問題快速解答

### Q1: 端口 8081 被占用

```bash
# 查找占用進程
lsof -i :8081

# 殺死進程
kill -9 <PID>

# 或修改 .env 中的 PORT
PORT=8082
```

### Q2: 數據庫連接失敗

```bash
# 檢查 Docker 容器
docker ps | grep postgres

# 如果沒有運行, 重啟
cd /Users/chingchingyeh/cofit/dtx-space/Vitera
docker-compose down
docker-compose up -d

# 檢查 DATABASE_URL
cat .env | grep DATABASE_URL
```

### Q3: Prisma Client 錯誤

```bash
# 重新生成 Prisma Client
pnpm prisma generate

# 如果還有問題, 清理後重建
rm -rf node_modules
pnpm install
pnpm prisma generate
```

### Q4: 依賴安裝失敗

```bash
# 清理緩存
pnpm store prune

# 刪除 node_modules 重新安裝
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q5: TypeScript 編譯錯誤

```bash
# 清理編譯輸出
rm -rf dist/

# 重新編譯
pnpm build

# 如果還有問題, 檢查 TypeScript 版本
pnpm list typescript
```

---

## 📚 下一步

### 學習架構

- 閱讀 [ARCHITECTURE.md](ARCHITECTURE.md) 了解系統架構
- 查看 `src/services/supplements.service.ts` 學習 Service 層實現
- 查看 `src/controllers/supplements.controller.ts` 學習 Controller 層實現

### 查看 API 文檔

- 閱讀 [API_DOCUMENTATION.md](API_DOCUMENTATION.md) 了解所有端點
- 使用 Postman 或 cURL 測試 API

### 添加新功能

- 參考 [MVC_MIGRATION_GUIDE.md](MVC_MIGRATION_GUIDE.md)
- 按照「如何添加新路由模塊」步驟操作

### 準備部署

- 閱讀 [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- 在 Staging 環境測試

---

## 📞 獲取幫助

### 文檔資源

- [README.md](README.md) - 項目總覽
- [ARCHITECTURE.md](ARCHITECTURE.md) - 架構設計
- [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - 故障排除

### 聯絡方式

- 查看項目 Issues
- 聯絡開發團隊
- 查閱 Fastify 官方文檔: https://fastify.dev/

---

**文檔編制:** Claude (Vitera 架構師)
**最後更新:** 2026-05-11
**版本:** 1.0.0
