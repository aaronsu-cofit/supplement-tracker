# Vitera Fastify MVC 完整測試檢查清單

## 前置準備
- [ ] 已安裝 Node.js 20+
- [ ] 已安裝 pnpm
- [ ] 數據庫連接正確配置
- [ ] 環境變量已設置（.env.local）
- [ ] 所有依賴已安裝 (`pnpm install`)

## 步驟 1: 編譯檢查
- [ ] 運行 `pnpm run build`
- [ ] 無 TypeScript 錯誤
- [ ] `dist/` 目錄生成成功
- [ ] 所有源文件已編譯

## 步驟 2: 單元測試
- [ ] 運行 `pnpm test`
- [ ] 所有 Service 層測試通過
- [ ] 所有 Controller 層測試通過
- [ ] 覆蓋率 > 80%

## 步驟 3: 啟動服務
- [ ] 運行 `node dist/fastify-app.js`
- [ ] 服務成功啟動在 port 8081
- [ ] 沒有錯誤日誌
- [ ] Pino logger 正常工作

## 步驟 4: 健康檢查
- [ ] `GET /health` 返回 200
- [ ] 響應包含 `status: ok`
- [ ] 時間戳格式正確

## 步驟 5: 認證測試
- [ ] `POST /api/auth/login` 返回 401（無 token）
- [ ] `POST /api/auth/register` 驗證電子郵件格式
- [ ] `GET /api/auth/me` 返回 401（無 token）

## 步驟 6: CRUD 操作測試
- [ ] 補充品：GET, POST, PUT, DELETE 工作正常
- [ ] 傷口：GET, POST, PATCH, DELETE 工作正常
- [ ] 用戶：GET, POST 工作正常
- [ ] 返回正確的 HTTP 狀態碼

## 步驟 7: 認證和授權測試
- [ ] JWT token 驗證工作正常
- [ ] Cookie 認證工作正常
- [ ] 管理員端點正確檢查角色
- [ ] 未授權端點返回 401/403

## 步驟 8: 錯誤處理測試
- [ ] 無效請求返回 400
- [ ] 未找到資源返回 404
- [ ] 衝突的資源返回 409
- [ ] 服務器錯誤返回 500

## 步驟 9: JSON Schema 驗證
- [ ] 無效的請求體被拒絕
- [ ] 詳細的驗證錯誤信息
- [ ] 強制的字段檢查工作正常

## 步驟 10: 性能基準測試
- [ ] 吞吐量 > 1000 req/s
- [ ] 平均延遲 < 100ms
- [ ] P99 延遲 < 500ms
- [ ] 無內存洩漏

## 步驟 11: DI 容器測試
- [ ] 所有服務都已註冊
- [ ] 服務以單例模式工作
- [ ] 沒有重複的實例創建

## 步驟 12: Hono vs Fastify 對比
- [ ] 相同的 API 端點返回相同的數據格式
- [ ] 相同的 HTTP 狀態碼
- [ ] 相同的錯誤信息
- [ ] 相同的業務邏輯行為

## 完成標準
- ✅ 所有編譯檢查通過
- ✅ 所有單元測試通過
- ✅ 服務成功啟動
- ✅ 所有關鍵端點驗證通過
- ✅ 沒有 JS/TS 錯誤
- ✅ 性能達到預期
- ✅ DI 容器正常工作
- ✅ 與 Hono 100% 兼容

## 故障排除

### 問題 1: TypeScript 編譯失敗
- [ ] 檢查 import 語句（使用 `.js` 後綴）
- [ ] 檢查類型定義
- [ ] 運行 `pnpm install` 更新依賴

### 問題 2: 服務啟動失敗
- [ ] 檢查 DATABASE_URL 環境變量
- [ ] 檢查端口 8081 是否被佔用
- [ ] 檢查 Prisma 連接

### 問題 3: API 端點返回 404
- [ ] 檢查路由是否在 fastify-app.ts 中註冊
- [ ] 檢查路由前綴是否正確
- [ ] 檢查 Services 是否在 DI 容器中

### 問題 4: 認證失敗
- [ ] 檢查 JWT_SECRET 環境變量
- [ ] 檢查 Token 格式
- [ ] 檢查中間件順序

### 問題 5: 端點驗證失敗
- [ ] 確認服務器已啟動（運行 `curl http://localhost:8081/health`）
- [ ] 檢查端點路徑是否正確
- [ ] 檢查 HTTP 方法是否正確
- [ ] 查看服務器日誌了解詳細錯誤

### 問題 6: 性能測試工具缺失
- [ ] 安裝 wrk：`brew install wrk`（macOS）
- [ ] 或安裝 Apache Bench：`brew install ab`
- [ ] 或使用 autocannon：`npm install -g autocannon`

## 報告模板

```
# Vitera Fastify MVC 測試報告

## 執行日期
- 2026-05-11

## 環境
- Node.js: v22.0.0
- pnpm: v9.0.0
- OS: macOS 14.0

## 測試結果

### 編譯
- TypeScript 編譯: ✅ 通過

### 單元測試
- 總計: 156 個測試
- 通過: 156
- 失敗: 0
- 覆蓋率: 85%

### 集成測試
- 健康檢查: ✅
- 認證: ✅
- CRUD: ✅
- 錯誤處理: ✅

### 性能測試
- 吞吐量: 2,500 req/s
- 平均延遲: 45ms
- P99 延遲: 200ms

## 結論
✅ **所有測試通過！** Fastify MVC 架構可以投入生產使用。
```

## 快速測試命令

```bash
# 完整測試套件
bash scripts/test-fastify-complete.sh

# 僅端點驗證
bash scripts/verify-endpoints.sh

# 僅性能測試
bash scripts/benchmark-performance.sh

# 編譯檢查
pnpm run build

# 單元測試
pnpm test

# 啟動服務器
node dist/fastify-app.js
```
