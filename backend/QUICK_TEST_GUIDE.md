# Vitera Fastify MVC 快速測試指南

## 🚀 快速開始

### 一鍵完整測試
```bash
# 執行完整測試套件（包括編譯、單元測試、端點驗證、性能測試）
bash scripts/test-fastify-complete.sh
```

---

## 📋 分步測試

### 步驟 1: 前置準備
```bash
# 確認當前目錄
cd /Users/chingchingyeh/cofit/dtx-space/Vitera/backend

# 安裝依賴（如果尚未安裝）
pnpm install

# 確認環境變量已設置
cat .env | grep -E "DATABASE_URL|JWT_SECRET"
```

### 步驟 2: 編譯檢查
```bash
# 清理舊的編譯文件
rm -rf dist

# 執行 TypeScript 編譯
pnpm run build

# 檢查編譯輸出
ls -la dist
```

**預期結果：**
- ✅ 無 TypeScript 錯誤
- ✅ `dist/` 目錄已生成
- ✅ 包含 `fastify-app.js` 等文件

### 步驟 3: 單元測試
```bash
# 執行所有單元測試
pnpm test

# 執行特定測試文件
pnpm test -- supplements.test.ts

# 生成測試覆蓋率報告
pnpm test -- --coverage
```

**預期結果：**
- ✅ 所有測試通過
- ✅ 測試覆蓋率 > 80%

### 步驟 4: 啟動服務器
```bash
# 啟動 Fastify 服務器
node dist/fastify-app.js

# 或在背景執行
node dist/fastify-app.js &
FASTIFY_PID=$!
```

**預期輸出：**
```
Server is running on http://0.0.0.0:8081
Press CTRL+C to stop
```

### 步驟 5: 健康檢查
```bash
# 檢查服務器是否正常運行
curl http://localhost:8081/health

# 或使用 jq 格式化 JSON
curl -s http://localhost:8081/health | jq
```

**預期響應：**
```json
{
  "status": "ok",
  "timestamp": "2026-05-11T10:00:00.000Z"
}
```

### 步驟 6: API 端點驗證
```bash
# 執行端點驗證腳本
bash scripts/verify-endpoints.sh
```

**預期結果：**
- ✅ 所有關鍵端點返回預期狀態碼
- ✅ 健康檢查：200
- ✅ 未授權端點：401
- ✅ 公開端點：200

### 步驟 7: 性能基準測試（可選）
```bash
# 安裝 wrk（如果尚未安裝）
brew install wrk

# 執行性能測試
bash scripts/benchmark-performance.sh
```

**預期結果：**
- ✅ 吞吐量 > 1000 req/s
- ✅ 平均延遲 < 100ms
- ✅ P99 延遲 < 500ms

### 步驟 8: 清理
```bash
# 停止背景服務器（如果有）
kill $FASTIFY_PID

# 或查找並停止所有 Node.js 進程
pkill -f "node dist/fastify-app.js"
```

---

## 🧪 個別端點測試

### 健康檢查
```bash
curl -X GET http://localhost:8081/health
```

### 認證端點
```bash
# 獲取當前用戶（需要 token）
curl -X GET http://localhost:8081/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 登入（需要提供 email 和 password）
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 註冊（需要提供完整信息）
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### 補充品端點
```bash
# 獲取所有補充品（需要認證）
curl -X GET http://localhost:8081/api/supplements \
  -H "Authorization: Bearer YOUR_TOKEN"

# 創建補充品（需要認證）
curl -X POST http://localhost:8081/api/supplements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Vitamin C","dosage":"1000mg","frequency":"daily"}'

# 獲取單個補充品
curl -X GET http://localhost:8081/api/supplements/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"

# 更新補充品
curl -X PUT http://localhost:8081/api/supplements/{id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dosage":"2000mg"}'

# 刪除補充品
curl -X DELETE http://localhost:8081/api/supplements/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 傷口端點
```bash
# 獲取所有傷口（需要認證）
curl -X GET http://localhost:8081/api/wounds \
  -H "Authorization: Bearer YOUR_TOKEN"

# 創建傷口記錄
curl -X POST http://localhost:8081/api/wounds \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location":"left arm","size":"2cm","status":"healing"}'
```

### 模組端點（公開）
```bash
# 獲取所有模組
curl -X GET http://localhost:8081/api/modules

# 獲取單個模組
curl -X GET http://localhost:8081/api/modules/{id}
```

### 產品端點（公開）
```bash
# 獲取所有產品
curl -X GET http://localhost:8081/api/products

# 獲取單個產品
curl -X GET http://localhost:8081/api/products/{id}
```

### HQ 管理端點（需要管理員權限）
```bash
# 獲取所有模組（管理員）
curl -X GET http://localhost:8081/api/hq/modules \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 創建模組
curl -X POST http://localhost:8081/api/hq/modules \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Module","description":"Module description"}'
```

---

## 🔍 常用測試命令

### 檢查服務器狀態
```bash
# 檢查端口是否被佔用
lsof -i :8081

# 查找 Node.js 進程
ps aux | grep node

# 檢查服務器日誌
tail -f server.log
```

### 數據庫相關
```bash
# 檢查數據庫連接
pnpm prisma db pull

# 查看數據庫狀態
pnpm prisma migrate status

# 重置數據庫（開發環境）
pnpm prisma migrate reset
```

### 環境變量檢查
```bash
# 查看所有環境變量
printenv | grep -E "DATABASE|JWT|PORT"

# 檢查 .env 文件
cat .env

# 驗證特定環境變量
echo $DATABASE_URL
echo $JWT_SECRET
```

---

## 🐛 快速除錯

### 服務器無法啟動
```bash
# 1. 檢查端口是否被佔用
lsof -i :8081

# 2. 終止佔用端口的進程
kill -9 <PID>

# 3. 檢查環境變量
cat .env | grep DATABASE_URL

# 4. 測試數據庫連接
pnpm prisma db pull
```

### 端點返回 404
```bash
# 1. 確認服務器正在運行
curl http://localhost:8081/health

# 2. 檢查路由是否註冊
cat dist/fastify-app.js | grep "register.*Router"

# 3. 確認端點路徑正確
# 正確：/api/supplements
# 錯誤：/supplements
```

### 認證失敗
```bash
# 1. 確認 token 格式
echo "YOUR_TOKEN" | base64 -d

# 2. 檢查 JWT_SECRET
echo $JWT_SECRET

# 3. 測試登入端點
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 測試腳本無法執行
```bash
# 添加執行權限
chmod +x scripts/test-fastify-complete.sh
chmod +x scripts/verify-endpoints.sh
chmod +x scripts/benchmark-performance.sh

# 或使用 bash 明確執行
bash scripts/test-fastify-complete.sh
```

---

## 📊 性能測試工具

### 使用 wrk
```bash
# 安裝
brew install wrk

# 基本測試
wrk -t4 -c100 -d10s http://localhost:8081/health

# 說明：
# -t4: 4 個線程
# -c100: 100 個併發連接
# -d10s: 測試持續 10 秒
```

### 使用 Apache Bench
```bash
# 安裝
brew install ab

# 基本測試
ab -n 1000 -c 100 http://localhost:8081/health

# 說明：
# -n 1000: 總共 1000 個請求
# -c 100: 100 個併發請求
```

### 使用 autocannon（Node.js）
```bash
# 安裝
npm install -g autocannon

# 基本測試
autocannon -c 100 -d 10 http://localhost:8081/health

# 說明：
# -c 100: 100 個併發連接
# -d 10: 測試持續 10 秒
```

---

## 📝 測試報告

測試完成後，使用以下模板填寫測試報告：

```bash
# 複製報告模板
cp TEST_REPORT_TEMPLATE.md TEST_REPORT_$(date +%Y%m%d).md

# 編輯報告
vim TEST_REPORT_$(date +%Y%m%d).md
```

---

## 🔗 相關文件

- [完整測試檢查清單](TESTING_CHECKLIST.md)
- [故障排除指南](TROUBLESHOOTING_GUIDE.md)
- [測試報告模板](TEST_REPORT_TEMPLATE.md)
- [MVC 遷移指南](MVC_MIGRATION_GUIDE.md)

---

## 💡 提示

1. **先執行編譯**：確保沒有 TypeScript 錯誤
2. **檢查環境變量**：特別是 DATABASE_URL 和 JWT_SECRET
3. **查看日誌**：服務器日誌通常包含有用的錯誤信息
4. **使用 jq**：格式化 JSON 響應更易讀
   ```bash
   brew install jq
   curl -s http://localhost:8081/health | jq
   ```
5. **保存測試結果**：將測試輸出保存到文件以便後續分析
   ```bash
   bash scripts/test-fastify-complete.sh | tee test-results.log
   ```

---

**記住：測試是確保代碼質量的關鍵！** 🎯
