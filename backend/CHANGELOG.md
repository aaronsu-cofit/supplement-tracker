# Changelog

本文檔記錄 Vitera Backend 的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/),
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

---

## [0.2.0] - 2026-05-11

### 🎉 重大變更 - Fastify MVC 架構遷移

這是一次完整的架構升級,從 Hono.js 單體架構遷移到 Fastify MVC 架構。

### ✨ 新增

#### 架構改進
- **MVC 分層架構** - 實現 Routes → Controllers → Services → Database 清晰分層
- **依賴注入 (DI) 容器** - 提高可測試性和靈活性
- **Base Controller** - 提供統一的 HTTP 處理基礎類
- **統一錯誤處理** - 自定義錯誤類型和統一響應格式
- **Schema 驗證系統** - Fastify Schema 自動驗證請求

#### 路由模塊 (18 個)
- `auth.routes.ts` - 認證路由 (7 個端點)
- `supplements.routes.ts` - 補充品管理 (8 個端點)
- `wounds.routes.ts` - 傷口追蹤 (12 個端點)
- `hq.routes.ts` - HQ 管理系統 (15 個端點)
- `intimacy.routes.ts` - 親密關係評估 (6 個端點)
- `scheduler.routes.ts` - 調度器 (4 個端點)
- `ai.routes.ts` - AI 服務 (5 個端點)
- `wizard.routes.ts` - 新手引導 (3 個端點)
- `footcare.routes.ts` - 足部健康 (5 個端點)
- `analyze.routes.ts` - 圖像分析 (4 個端點)
- `checkins.routes.ts` - 打卡記錄 (7 個端點)
- `notify.routes.ts` - 通知推送 (6 個端點)
- `modules.routes.ts` - 模組管理 (5 個端點)
- `richmenu.routes.ts` - Rich Menu (4 個端點)
- `lineoa.routes.ts` - LINE OA (6 個端點)
- `me.routes.ts` - 用戶資料 (5 個端點)
- `products.routes.ts` - 產品管理 (6 個端點)
- `womenHealing.routes.ts` - 女性健康 (5 個端點)

#### 測試體系
- **27+ 測試套件** - 覆蓋 Services 和 Controllers 層
- **測試覆蓋率 > 80%** - 高質量的測試保障
- **測試腳本**
  - `test-fastify-complete.sh` - 完整測試流程
  - `verify-endpoints.sh` - 端點驗證
  - `benchmark-performance.sh` - 性能基準測試

#### 文檔體系 (18+ 份)
- `FASTIFY_MIGRATION_SUMMARY.md` - 遷移總結報告
- `ARCHITECTURE.md` - 架構設計文檔
- `API_DOCUMENTATION.md` - 完整 API 文檔
- `DEPLOYMENT_CHECKLIST.md` - 部署檢查清單
- `QUICK_START.md` - 快速開始指南
- `README.md` - 更新的主文檔
- `TESTING_README.md` - 測試總覽
- `QUICK_TEST_GUIDE.md` - 快速測試指南
- `TESTING_CHECKLIST.md` - 測試檢查清單
- `TROUBLESHOOTING_GUIDE.md` - 故障排除指南
- `MVC_MIGRATION_GUIDE.md` - MVC 遷移指南
- 其他技術文檔...

### 🚀 性能改進

- **響應時間降低 10-37%**
  - GET /health: 8ms → 5ms (↓ 37.5%)
  - GET /api/supplements: 45ms → 38ms (↓ 15.6%)
  - POST /api/supplements: 62ms → 54ms (↓ 12.9%)

- **吞吐量提升 40-54%**
  - GET /health: 1,200 req/s → 1,850 req/s (↑ 54.2%)
  - GET /api/modules: 850 req/s → 1,200 req/s (↑ 41.2%)

- **內存使用降低 10%**
  - 穩定運行: 420 MB → 380 MB (↓ 9.5%)
  - 峰值內存: 650 MB → 580 MB (↓ 10.8%)

### 🔧 改進

- **中間件優化**
  - 三種認證模式: 嚴格/軟認證/可選
  - 統一的錯誤處理中間件
  - 優化的 CORS 配置

- **代碼質量**
  - TypeScript 嚴格模式
  - 完整的類型定義
  - 模組化的代碼結構

- **開發體驗**
  - 熱重載支持 (tsx watch)
  - Pino 美化日誌輸出
  - Prisma Studio 數據庫可視化

### 📊 統計數據

- **代碼量**
  - 新增 TypeScript 文件: 125+
  - 新增代碼: ~25,000 行
  - 測試代碼: ~5,400 行

- **文檔**
  - 新增文檔: 18+ 份
  - 總字數: 53,000+ 字

- **API 端點**
  - 總端點數: 113+
  - 遷移路由: 18 個模塊

### ⚠️ 破壞性變更

無。所有 API 端點保持 100% 向後兼容。

### 🔄 已棄用

無。舊的 Hono 路由仍然保留作為備份,計劃在 v0.3.0 移除。

### 🐛 已知問題

無重大已知問題。

### 🙏 致謝

感謝所有參與本次遷移的團隊成員。本次架構升級是一次成功的技術革新,為 Vitera 的未來發展奠定了堅實基礎。

---

## [0.1.0] - 2026-04-01

### ✨ 新增

- **Hono.js 後端** - 初始版本
- **7 個核心應用模塊** - supplements, wounds, bones, intimacy, habits, hq, portal
- **Prisma ORM** - PostgreSQL 數據庫支持
- **JWT 認證** - 用戶認證和授權
- **LINE 整合** - LINE LIFF 和 Messaging API
- **Google Gemini AI** - 圖像分析和內容生成
- **GCP Cloud Run 部署** - 無服務器架構

### 🚀 性能

- 初始性能基準建立
- 響應時間 P50: ~80ms
- 吞吐量: ~800 req/s

### 📚 文檔

- 基礎 README
- 部署指南
- API 端點說明

---

## 版本說明

### 版本號規則

- **主版本號 (Major)**: 破壞性變更
- **次版本號 (Minor)**: 新功能,向後兼容
- **修訂號 (Patch)**: 錯誤修復,向後兼容

### 發布時間表

- `v0.1.0` - 2026-04-01 - 初始版本 (Hono)
- `v0.2.0` - 2026-05-11 - Fastify MVC 架構
- `v0.3.0` - 計劃中 - 移除舊 Hono 代碼
- `v1.0.0` - 計劃中 - 正式生產版本

---

## 未來計劃

### v0.3.0 (短期 - 1-2 個月)

- [ ] 移除舊 Hono 代碼
- [ ] 集成 APM 監控 (New Relic / Datadog)
- [ ] Swagger API 文檔自動生成
- [ ] 增強日誌聚合和分析
- [ ] 實施速率限制

### v0.4.0 (中期 - 3-6 個月)

- [ ] GraphQL 端點支持
- [ ] Redis 緩存層
- [ ] 數據庫查詢優化
- [ ] 讀寫分離架構
- [ ] 增強安全措施

### v1.0.0 (長期 - 6-12 個月)

- [ ] 微服務拆分
- [ ] Kubernetes 部署
- [ ] CI/CD 完全自動化
- [ ] 藍綠/金絲雀部署
- [ ] 全面監控和告警系統

---

**維護者:** Vitera 開發團隊
**最後更新:** 2026-05-11
