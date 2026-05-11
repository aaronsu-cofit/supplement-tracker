# Vitera Fastify MVC 故障排除指南

## 目錄
1. [編譯問題](#編譯問題)
2. [服務啟動問題](#服務啟動問題)
3. [API 端點問題](#api-端點問題)
4. [認證問題](#認證問題)
5. [數據庫問題](#數據庫問題)
6. [性能問題](#性能問題)
7. [DI 容器問題](#di-容器問題)
8. [測試問題](#測試問題)

---

## 編譯問題

### 問題：TypeScript 編譯失敗 - 找不到模組

**症狀：**
```
Error: Cannot find module './something'
```

**解決方案：**
1. 確認所有 import 語句使用 `.js` 後綴（即使是 TypeScript 文件）
   ```typescript
   // ❌ 錯誤
   import { Something } from './something'

   // ✅ 正確
   import { Something } from './something.js'
   ```

2. 檢查 tsconfig.json 設定：
   ```json
   {
     "compilerOptions": {
       "module": "ESNext",
       "moduleResolution": "node"
     }
   }
   ```

3. 重新安裝依賴：
   ```bash
   rm -rf node_modules
   pnpm install
   ```

### 問題：類型定義錯誤

**症狀：**
```
Type 'X' is not assignable to type 'Y'
```

**解決方案：**
1. 檢查 Prisma 類型是否最新：
   ```bash
   pnpm prisma generate
   ```

2. 確認介面定義一致：
   - 檢查 Service 層的返回類型
   - 檢查 Controller 層的參數類型
   - 確保 DTOs 與 Prisma 模型對應

3. 清理並重新編譯：
   ```bash
   rm -rf dist
   pnpm run build
   ```

---

## 服務啟動問題

### 問題：服務啟動失敗 - 端口被佔用

**症狀：**
```
Error: listen EADDRINUSE: address already in use :::8081
```

**解決方案：**
1. 查找佔用端口的進程：
   ```bash
   lsof -i :8081
   ```

2. 終止該進程：
   ```bash
   kill -9 <PID>
   ```

3. 或使用不同的端口：
   ```bash
   PORT=8082 node dist/fastify-app.js
   ```

### 問題：數據庫連接失敗

**症狀：**
```
Error: Can't reach database server
```

**解決方案：**
1. 檢查 DATABASE_URL 環境變量：
   ```bash
   echo $DATABASE_URL
   ```

2. 確認 .env 文件存在且正確：
   ```bash
   cat .env | grep DATABASE_URL
   ```

3. 測試數據庫連接：
   ```bash
   pnpm prisma db pull
   ```

4. 確認數據庫服務運行：
   ```bash
   # PostgreSQL
   brew services list | grep postgresql

   # 或檢查 Docker 容器
   docker ps | grep postgres
   ```

### 問題：環境變量未加載

**症狀：**
```
JWT_SECRET is not defined
```

**解決方案：**
1. 確認 .env 文件存在：
   ```bash
   ls -la .env
   ```

2. 檢查環境變量是否正確設置：
   ```bash
   cat .env
   ```

3. 重新加載環境變量：
   ```bash
   source .env
   node dist/fastify-app.js
   ```

---

## API 端點問題

### 問題：端點返回 404

**症狀：**
```
{"statusCode":404,"error":"Not Found","message":"Route not found"}
```

**解決方案：**
1. 檢查路由是否在 `fastify-app.ts` 中註冊：
   ```typescript
   // 確認這些行存在
   app.register(authRouter, { prefix: '/api/auth' })
   app.register(supplementsRouter, { prefix: '/api/supplements' })
   ```

2. 確認路由前綴正確：
   ```bash
   # 正確
   curl http://localhost:8081/api/supplements

   # 錯誤（缺少 /api）
   curl http://localhost:8081/supplements
   ```

3. 檢查路由文件是否正確導出：
   ```typescript
   // routes/supplements.routes.ts
   export default supplementsRouter
   ```

### 問題：端點返回 500 內部錯誤

**症狀：**
```
{"statusCode":500,"error":"Internal Server Error"}
```

**解決方案：**
1. 查看服務器日誌找到詳細錯誤：
   ```bash
   node dist/fastify-app.js | tee server.log
   ```

2. 檢查 Service 層是否正確注入：
   ```typescript
   // 確認 Service 已在 DI 容器中註冊
   container.registerSingleton('SupplementsService', SupplementsService)
   ```

3. 檢查數據庫查詢是否正確：
   ```typescript
   // 添加 try-catch 捕獲錯誤
   try {
     const result = await prisma.supplement.findMany()
   } catch (error) {
     console.error('Database error:', error)
     throw error
   }
   ```

### 問題：端點返回 401 未授權

**症狀：**
```
{"statusCode":401,"error":"Unauthorized"}
```

**解決方案：**
1. 檢查是否提供了有效的 token：
   ```bash
   # 帶 Authorization header
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8081/api/auth/me
   ```

2. 確認 JWT_SECRET 已設置：
   ```bash
   echo $JWT_SECRET
   ```

3. 檢查認證中間件是否正確應用：
   ```typescript
   // routes/supplements.routes.ts
   supplementsRouter.get('/',
     { preHandler: [authenticateUser] },
     controller.getSupplements.bind(controller)
   )
   ```

---

## 認證問題

### 問題：JWT Token 驗證失敗

**症狀：**
```
Invalid token
```

**解決方案：**
1. 確認 token 格式正確（Bearer token）：
   ```bash
   # 正確
   Authorization: Bearer eyJhbGc...

   # 錯誤
   Authorization: eyJhbGc...
   ```

2. 檢查 token 是否過期：
   ```typescript
   // 使用 jwt-decode 檢查
   import jwtDecode from 'jwt-decode'
   const decoded = jwtDecode(token)
   console.log('Token expires:', new Date(decoded.exp * 1000))
   ```

3. 驗證 JWT_SECRET 一致性：
   - 確保簽發和驗證時使用相同的 SECRET

### 問題：Cookie 認證不工作

**症狀：**
```
No token found in cookie
```

**解決方案：**
1. 確認 cookie 設置正確：
   ```typescript
   reply.setCookie('token', jwtToken, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     path: '/'
   })
   ```

2. 檢查瀏覽器 cookie：
   - 打開開發者工具 → Application → Cookies
   - 確認 token cookie 存在

3. 確認請求包含 cookie：
   ```bash
   curl -b "token=YOUR_TOKEN" http://localhost:8081/api/auth/me
   ```

---

## 數據庫問題

### 問題：Prisma 查詢失敗

**症狀：**
```
PrismaClientKnownRequestError
```

**解決方案：**
1. 檢查 Prisma schema 是否最新：
   ```bash
   pnpm prisma generate
   ```

2. 確認數據庫 migration 已執行：
   ```bash
   pnpm prisma migrate deploy
   ```

3. 檢查查詢語法：
   ```typescript
   // 確認欄位名稱正確
   const supplement = await prisma.supplement.findUnique({
     where: { id: supplementId }
   })
   ```

### 問題：外鍵約束錯誤

**症狀：**
```
Foreign key constraint failed
```

**解決方案：**
1. 確認關聯的記錄存在：
   ```typescript
   // 先檢查 user 是否存在
   const user = await prisma.user.findUnique({ where: { id: userId } })
   if (!user) throw new Error('User not found')
   ```

2. 檢查 Prisma schema 的關聯定義：
   ```prisma
   model Supplement {
     id     String @id @default(cuid())
     userId String
     user   User   @relation(fields: [userId], references: [id])
   }
   ```

---

## 性能問題

### 問題：響應時間過慢

**症狀：**
- 平均延遲 > 500ms
- P99 延遲 > 2s

**解決方案：**
1. 添加數據庫查詢索引：
   ```prisma
   model Supplement {
     userId String @index
   }
   ```

2. 使用查詢優化：
   ```typescript
   // 使用 select 只取需要的欄位
   const supplements = await prisma.supplement.findMany({
     select: { id: true, name: true, dosage: true }
   })
   ```

3. 實施分頁：
   ```typescript
   const supplements = await prisma.supplement.findMany({
     skip: (page - 1) * pageSize,
     take: pageSize
   })
   ```

### 問題：內存洩漏

**症狀：**
- 內存使用持續增長
- 服務器最終崩潰

**解決方案：**
1. 確保 Prisma 客戶端正確關閉：
   ```typescript
   // 在應用關閉時
   await prisma.$disconnect()
   ```

2. 檢查是否有未關閉的連接或監聽器

3. 使用 Node.js memory profiler：
   ```bash
   node --inspect dist/fastify-app.js
   ```

---

## DI 容器問題

### 問題：服務未註冊

**症狀：**
```
Service 'SupplementsService' not found in container
```

**解決方案：**
1. 確認服務已在 `container/index.ts` 中註冊：
   ```typescript
   container.registerSingleton('SupplementsService', SupplementsService)
   ```

2. 檢查服務名稱拼寫：
   ```typescript
   // 名稱必須完全一致
   const service = container.resolve('SupplementsService')
   ```

### 問題：循環依賴

**症狀：**
```
Circular dependency detected
```

**解決方案：**
1. 重構服務結構避免循環依賴
2. 使用工廠模式延遲初始化
3. 考慮將共享邏輯提取到獨立的 utility 模組

---

## 測試問題

### 問題：測試腳本執行失敗

**症狀：**
```
bash: permission denied: ./scripts/test-fastify-complete.sh
```

**解決方案：**
1. 添加執行權限：
   ```bash
   chmod +x scripts/test-fastify-complete.sh
   chmod +x scripts/verify-endpoints.sh
   chmod +x scripts/benchmark-performance.sh
   ```

2. 使用 bash 明確執行：
   ```bash
   bash scripts/test-fastify-complete.sh
   ```

### 問題：端點驗證失敗

**症狀：**
```
curl: (7) Failed to connect to localhost port 8081
```

**解決方案：**
1. 確認服務器已啟動：
   ```bash
   curl http://localhost:8081/health
   ```

2. 等待服務器完全啟動（增加 sleep 時間）：
   ```bash
   # 在測試腳本中
   node dist/fastify-app.js &
   sleep 5  # 增加到 5 秒
   ```

3. 檢查端口號是否正確

### 問題：性能測試工具缺失

**症狀：**
```
wrk: command not found
```

**解決方案：**
1. 安裝 wrk（macOS）：
   ```bash
   brew install wrk
   ```

2. 或使用替代工具：
   ```bash
   # Apache Bench
   brew install ab
   ab -n 1000 -c 100 http://localhost:8081/health

   # autocannon (Node.js)
   npm install -g autocannon
   autocannon -c 100 -d 10 http://localhost:8081/health
   ```

---

## 常見錯誤代碼對照表

| 錯誤代碼 | 含義 | 常見原因 |
|---------|------|---------|
| 400 | Bad Request | 請求參數不正確或缺少必填字段 |
| 401 | Unauthorized | 缺少認證 token 或 token 無效 |
| 403 | Forbidden | token 有效但沒有權限訪問資源 |
| 404 | Not Found | 路由不存在或資源不存在 |
| 409 | Conflict | 資源衝突（如嘗試創建已存在的資源） |
| 500 | Internal Server Error | 服務器內部錯誤（檢查日誌） |

---

## 獲取幫助

如果以上解決方案都無法解決問題：

1. **查看詳細日誌：**
   ```bash
   node dist/fastify-app.js | tee server.log
   ```

2. **啟用 debug 模式：**
   ```bash
   DEBUG=* node dist/fastify-app.js
   ```

3. **檢查文檔：**
   - [Fastify 文檔](https://fastify.dev/)
   - [Prisma 文檔](https://www.prisma.io/docs/)
   - [TypeScript 文檔](https://www.typescriptlang.org/docs/)

4. **聯繫開發團隊**
