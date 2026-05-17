# Health & Care 專案開發文件總站 (Documentation)

歡迎來到 **Health & Care** 的開發者技術文件中心！
為了讓新加入的工程師能快速找到所需資訊，我們採用 [Diátaxis 框架](https://diataxis.fr/) 嚴格區分了文件的用途。


---

## 🧭 文件導航

請根據您現在的**目的**，點擊對應的板塊：

### 🐣 1. 我想要把專案跑起來 (Tutorials)
這個板塊專注於「帶領新手獲得第一次成功的體驗」，不探討複雜原理。

* [本地端開發快速啟動教學](./tutorials/01-local-setup.md)

### 🛠️ 2. 我想要實作特定功能 (How-to Guides)
這個板塊提供步驟式的操作手冊，解決特定情境的問題。

* [如何將專案部署到 Vercel (CI/CD)](./how-to/deploy.md)
* [常見問題排除 (Troubleshooting)](./how-to/troubleshooting.md)
* [操作 LLM Fallback 與對話審查](./how-to/operating-llm-fallback.md)
* *(待補)* 如何串接新的 LIFF ID
* *(待補)* 如何新增一個 API 路由

### 📖 3. 我想要查閱規格細節 (Reference)
這個板塊要求絕對的準確性與結構化，適合開發中隨時查詢。

#### 前端 & 通用規格

* [資料庫 Schema 參考 (DB Schema)](./reference/database-schema.md)
* [所有 API 路由清單 (API Endpoints)](./reference/api-endpoints.md)
* [雙重認證與 LIFF 流程規格 (Auth Flow)](./reference/auth-flow.md)
* [LLM 整合架構 (LLM Architecture)](./reference/llm-architecture.md)
* [各模組版本與迭代歷程 (Module Versions)](./reference/module-versions.md)

#### Backend 技術規格

* [Scheduler 系統規格 (Scheduler System)](../backend/docs/scheduler-system.md) - 推播排程系統的完整規格，包含節點類型、冪等性、時區處理
* [Enrollments & Scenarios 指南 (Enrollments Guide)](../backend/docs/enrollments-scenarios-guide.md) - 場景參加機制、DAG 流程、推播時序
* [HQ Backend 完整架構 (HQ Backend Architecture)](../backend/docs/hq-backend-architecture.md) - 後台系統架構、Templates 與 Scenarios 關係
* [資料庫規範 (DB Conventions)](../backend/docs/db-conventions.md) - 資料庫設計規範與命名慣例
* [BaseController 使用方式 (BaseController Usage)](../backend/docs/base-controller-usage.md) - Controller 基礎類別規格與錯誤處理
* [問卷系統範例 (Questionnaire Examples)](../backend/docs/questionnaire-examples.md) - 各種問卷題型範例

### 🧠 4. 我想要理解背後原理 (Explanation)
這個板塊專注於「Why」，解釋系統演進脈絡與架構設計決策。

* [專案架構總覽 (Architecture Overview)](./explanation/architecture-overview.md)
* [HQ 平台核心概念 (HQ Architecture)](./explanation/HQ-Arch.md) - 多租戶架構、Hook 鏈、Scheduler、Scenarios 與 Templates 的關係
* [V3：GCP MedLM 與醫療 AI 升級企劃](./explanation/planning/V3_MEDLM_INTEGRATION.md)

---

> 💡 **文件維護守則**：
> 當您需要新增文件時，請先思考 **讀者的目的** 是上述四種的哪一種，再把文件放到對應的資料夾內，避免把教學、規格和原理解釋全部混雜在同一份文件中。
