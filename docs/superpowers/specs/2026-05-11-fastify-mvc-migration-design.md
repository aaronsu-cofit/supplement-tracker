# Vitera Backend: Hono → Fastify + MVC 架構遷移設計

**日期：** 2026-05-11
**狀態：** 已批准
**時間線：** 2-3 週
**優先級：** 高

---

## 📌 概述

將 Vitera backend 從 **Hono 4.7.4** 遷移至 **Fastify**，同時重構為 **MVC 架構**。目標是提升性能（吞吐量 +30-50%）同時改進代碼組織和可維護性。

---

## 🎯 目標

1. **功能等價** - 所有 API 端點行為完全相同
2. **性能提升** - 吞吐量 +30-50%，延遲 -15-25%
3. **代碼質量** - MVC 分層，提高可測試性和可維護性
4. **無停機遷移** - 生產系統支持（暫停時間最小化）

---

## 🏗️ 架構設計

### 新目錄結構

```
src/
├── index.ts                    # Fastify 初始化、中間件、路由組裝
├── config/
│   └── fastify.ts              # Fastify 配置（CORS、Logger、插件）
├── controllers/                # HTTP 層：請求驗證、響應格式化
│   ├── auth.controller.ts
│   ├── wounds.controller.ts
│   ├── hq.controller.ts
│   └── (12+ 個控制器)
├── services/                   # 業務邏輯層
│   ├── auth.service.ts
│   ├── wounds.service.ts
│   ├── hq.service.ts
│   └── (12+ 個服務)
├── models/                     # 數據層（Prisma 封裝）
│   ├── user.model.ts
│   ├── wound.model.ts
│   ├── admin.model.ts
│   └── (其他模型)
├── middleware/                 # Fastify 中間件
│   ├── auth.middleware.ts      # JWT + Cookie 驗證
│   ├── errorHandler.ts         # 全局錯誤處理
│   └── logger.ts               # 日誌中間件
├── types/                      # TypeScript 類型（保留，最小改動）
│   └── index.ts
├── lib/                        # 工具函數（保留，最小改動）
│   ├── db.ts                   # Prisma 初始化
│   ├── auth.ts                 # JWT、密碼加密
│   ├── scheduler.ts            # Cron 任務
│   └── (其他工具)
└── prisma/                     # ORM（保留，不變）
    ├── schema.prisma
    └── migrations/
```

### 層次職責

| 層 | 職責 | 範例 |
|----|------|------|
| **Controller** | HTTP 請求處理、參數驗證、響應格式化 | 驗證 email、調用 Service、返回 JSON |
| **Service** | 業務邏輯、事務管理、複雜計算 | 密碼驗證、Token 生成、用戶查詢 |
| **Model** | 數據訪問、Prisma 查詢封裝 | `prisma.user.findUnique()` 的包裝 |
| **Middleware** | 全局請求/響應處理 | JWT 驗證、CORS、日誌記錄、錯誤捕捉 |

---

## 🔄 遷移策略

### 分階段執行

**第 1 階段（3-4 天）：基礎設施**
- Fastify + 插件初始化
- Controller 層架構設計
- 中間件框架建立

**第 2 階段（4-5 天）：核心路由遷移**
- 優先遷移：auth、supplements、wounds、hq
- 測試：單元 + 集成測試
- 逐步驗證功能等價

**第 3 階段（3-4 天）：Service 層重構**
- 抽取業務邏輯到 Service
- 實現依賴注入
- Model 層封裝

**第 4 階段（2-3 天）：完整集成**
- Cron 任務（scheduler）適配
- Cookie + JWT 端到端測試
- 所有 12+ 路由完成

**第 5 階段（3-4 天）：測試 + 優化**
- 全量集成測試套件
- 性能基準測試（vs Hono）
- Bug 修復、性能微調

### 總時間：**2-3 週**

---

## 🔌 關鍵技術選型

| 組件 | 選擇 | 原因 |
|------|------|------|
| **框架** | Fastify (latest) | 最新版本、高性能、豐富的插件生態 |
| **ORM** | Prisma 6.19.3 | 已驗證、無需改動 |
| **驗證** | Fastify JSON Schema | 內置、無額外依賴 |
| **日誌** | Pino（Fastify 預設） | 高性能、JSON 格式 |
| **錯誤處理** | Fastify setErrorHandler | 內置、統一錯誤處理 |
| **認證** | JWT + Cookie（保留現有） | 完全兼容 |

---

## 📊 性能預期

根據 Fastify 官方基準測試及社區報告：

| 指標 | Hono | Fastify | 提升 |
|------|------|---------|------|
| **吞吐量** (req/s) | ~25k | ~35-40k | **+40-60%** |
| **平均延遲** (ms) | 10-15 | 8-12 | **-15-25%** |
| **P99 延遲** (ms) | 30-50 | 20-35 | **-30-40%** |
| **內存** (MB) | ~120 | ~130-150 | +10-25% |

**驗證方法：**
- Apache Bench / wrk 工具進行負載測試
- Hono 版本 vs Fastify 版本對標

---

## ⚠️ 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|---------|
| **路由遷移遺漏** | 功能缺失 | 自動化檢查腳本、端到端測試 |
| **中間件順序差異** | 行為不同 | 詳細的中間件順序文檔 |
| **Cookies 處理差異** | 認證失敗 | 深度測試 JWT + Cookie 流程 |
| **性能未達預期** | 投資回報低 | 保留 Hono 回滾方案（可快速切換） |
| **團隊學習曲線** | 維護難度高 | Fastify 文檔、内部培訓 |

---

## 🧪 測試策略

### 單元測試
- 每個 Service 獨立測試
- Mock Prisma 客户端
- 覆蓋率目標：>80%

### 集成測試
- 完整 API 端點測試（auth、wounds 等）
- 驗證 JWT + Cookie 流程
- 錯誤場景（401、403、422）

### 性能測試
- 基準測試：1000 concurrent users, 60s duration
- 對比：現有 Hono 版本
- 記錄：吞吐量、延遲、CPU、內存

### 煙霧測試（部署前）
- 快速功能驗證（健康檢查、登錄、基本 CRUD）

---

## 📝 部署計劃

### Staging 驗證
1. 部署 Fastify 版本到 staging
2. 運行全量測試套件（24 小時）
3. 性能基準測試對比
4. 團隊驗收測試

### Production 切換
1. 藍綠部署：新 Fastify 容器與舊 Hono 並行
2. 漸進流量轉移：10% → 50% → 100%
3. 監控關鍵指標：錯誤率、延遲、CPU
4. 回滾方案：30 秒內切回 Hono

---

## 🔄 後續改進（Phase 2）

- Fastify 插件化架構深化（plugin-based 組織）
- OpenAPI/Swagger 文檔自動生成
- 性能進一步優化（streaming、compression）
- 監控告警集成（Datadog / New Relic）

---

## ✅ 驗收標準

- [ ] 所有 12+ 路由遷移完成
- [ ] 功能測試通過率 100%
- [ ] 性能提升 ≥ 30%（吞吐量）
- [ ] 錯誤率 < 0.1%（vs 現有版本）
- [ ] 文檔完整（API、架構、部署）

---

## 📚 參考資源

- Fastify 官方文檔：https://www.fastify.io/
- Fastify + TypeScript：https://www.fastify.io/docs/latest/Guides/TypeScript/
- Prisma 整合：https://www.prisma.io/docs/concepts/components/prisma-client

