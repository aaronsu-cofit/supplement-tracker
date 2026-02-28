# Health & Care 專案開發文件總站 (Documentation)

歡迎來到 **Health & Care** 的開發者技術文件中心！
為了讓新加入的工程師能快速找到所需資訊，我們採用 [Diátaxis 框架](https://diataxis.fr/) 嚴格區分了文件的用途。

> 本專案為兼具「保健品追蹤」與「傷口遠距照護」的多模組健康平台。

---

## 🧭 文件導航

請根據您現在的**目的**，點擊對應的板塊：

### 🐣 1. 我想要把專案跑起來 (Tutorials)
這個板塊專注於「帶領新手獲得第一次成功的體驗」，不探討複雜原理。

* [本地端開發快速啟動教學](./tutorials/01-local-setup.md)

### 🛠️ 2. 我想要實作特定功能 (How-to Guides)
這個板塊提供步驟式的操作手冊，解決特定情境的問題。

* [如何將專案部署到 Vercel (CI/CD)](./how-to/deploy.md)
* *(待補)* 如何串接新的 LIFF ID
* *(待補)* 如何新增一個 API 路由

### 📖 3. 我想要查閱規格細節 (Reference)
這個板塊要求絕對的準確性與結構化，適合開發中隨時查詢。

* [資料庫 Schema 參考 (DB Schema)](./reference/database-schema.md)
* [所有 API 路由清單 (API Endpoints)](./reference/api-endpoints.md)
* [雙重認證與 LIFF 流程規格 (Auth Flow)](./reference/auth-flow.md)

### 🧠 4. 我想要理解背後原理 (Explanation)
這個板塊專注於「Why」，解釋系統演進脈絡與架構設計決策。

* [專案架構總覽 (Architecture Overview)](./explanation/architecture-overview.md)
* [V3：GCP MedLM 與醫療 AI 升級企劃](./explanation/planning/V3_MEDLM_INTEGRATION.md)

---

> 💡 **文件維護守則**：
> 當您需要新增文件時，請先思考 **讀者的目的** 是上述四種的哪一種，再把文件放到對應的資料夾內，避免把教學、規格和原理解釋全部混雜在同一份文件中。
