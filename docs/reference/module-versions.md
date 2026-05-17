# 模組版本與迭代歷程 (Module Version History)

本專案採用多模組 (Multi-module) 架構，各項健康照護防線依賴獨立的迭代節奏。
本文件用於精確記錄各模組的當前版本號，以及重要的更新特徵。

---

## 💊 保健品追蹤模組 (`/supplements`)

**當前版本：V2.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V2.0** | 2025-11 | **雙視圖月曆與進度系統**<br>- 實作 Daily / Weekly / Monthly 巢狀視圖<br>- 加入微型進度條 (Mini Progress Bar)<br>- 支援 Template 分類與後台管理<br>- 支援更靈活的重複性任務 (Recurrence options) 與子任務 (Subtasks) |
| **V1.0** | (前期) | **MVP 上線**<br>- 實作基本的保健品掃描與建立<br>- 結合 LIFF Flex Message 推送提醒 |

---

## 🩹 傷口照護模組 (`/wounds`)

**當前版本：V2.1**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V2.1** | 2026-02 | **Admin Dashboard 與系統整合優化**<br>- 於後台管理介面導入垂直時間軸 (Vertical Timeline)<br>- 整合 LINE Profile 資料，動態綁定並顯示真實病患大頭貼與姓名<br>- 開放直接修改病患姓名 (`PATCH` 支援) |
| **V2.0** | 2026-02 | **多傷口架構與互動升級**<br>- Schema 升級：支援 `wound_type`, `body_location`, `status`<br>- 新增獨立單一傷口的 Dashboard 與下拉式切換選單<br>- 加入建檔精靈與傷口封存/編輯 Modal<br>- 整合 Gemini `system_instruction` 與結構化 JSON Schema 以提供更穩定的 SOAP 紀錄 |
| **V1.0** | (前期) | **MVP 上線**<br>- 單次傷口攝影分析<br>- NRS 痛覺評分與基礎症狀追蹤 |

---

## 🦴 足踝照護模組 (`/bones`)

**當前版本：V3.2**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V3.2** | 2026-03 | **智能相機引擎 (WebRTC Camera)**<br>- 放棄 `<input capture>`，改用 `getUserMedia` 自製即時網頁相機<br>- 疊加 Absolute SVG 導引線於視訊畫面上<br>- 加入防 iOS 黑屏的 WebRTC 效能優化與生命週期控制 |
| **V3.1** | 2026-02 | **視覺化增強與歷史追蹤**<br>- 於診斷結果頁疊加 AI Bounding Box (動態外翻方框標註)<br>- 支援相機與相簿雙重輸入 Fallback<br>- 新增 `/bones/history` 時間軸歷程追蹤 |
| **V3.0** | 2026-02 | **MVP: 骨科與輔具防線**<br>- 導入 Gemini 2.5 Flash 扮演骨科專家進行定性評估<br>- 結合靜態足部痛點評估 (`/assess`) 與 NRS 收集<br>- 新建獨立 `/bones` Route 與專屬 DB Tables |

---

## 💗 親密健康模組 (`/intimacy`)

**當前版本：V1.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V1.0** | 2026-01 | **MVP 上線**<br>- 親密健康評估問卷<br>- AI 個人化建議與摘要<br>- 支援性別與主要關注點選擇 |

---

## 🩸 經期追蹤模組 (`/period-tracker`)

**當前版本：V1.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V1.0** | 2026-05 | **MVP 上線**<br>- 經期記錄與預測系統<br>- 月曆視圖與經期狀態標記<br>- 每日詳細記錄（症狀、情緒、血量、血色、血塊）<br>- PBAC 計分系統<br>- Onboarding 引導流程<br>- 經期週期設定（週期長度、經期長度） |

---

## 🧘 女性療癒室模組 (`/women-healing-room`)

**當前版本：V1.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V1.0** | 2026-01 | **MVP 上線**<br>- 日記記錄與 AI 回饋<br>- 放鬆練習（呼吸、身體掃描、睡前語錄）<br>- 心理健康評估<br>- 心情與睡眠追蹤 |

---

## 📝 問卷系統模組 (`/questionnaires`)

**當前版本：V1.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V1.0** | 2026-03 | **問卷框架上線**<br>- 動態問卷規格系統（JSON-based）<br>- 支援多種題型與分支邏輯<br>- 自動計分與結果解讀<br>- on_submit_actions 整合（設定屬性、分配任務） |

---

## 🎯 習慣追蹤系統 (`/habits`)

**當前版本：V2.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V2.0** | 2026-04 | **進階習慣追蹤**<br>- 每日習慣打卡系統<br>- 四種任務類型：one_shot、binary_daily、quantitative_daily、checklist_daily<br>- 使用者自訂每日目標<br>- 提醒功能設定<br>- 習慣分類管理 |
| **V1.0** | 2026-02 | **基礎任務系統**<br>- 一次性任務分配<br>- 進度追蹤<br>- 任務完成通知 |

---

## 🏢 後台管理系統 (`/hq`)

**當前版本：V3.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V3.0** | 2026-04 | **完整後台生態系統**<br>- LINE OA 多租戶管理<br>- Product 配置包系統<br>- 內容管理（Content Items）<br>- 意圖規則（Intent Rules）<br>- 任務模板（Mission Templates）<br>- 徽章系統（Badge Templates）<br>- 旅程系統（Journey Templates）<br>- 問卷管理<br>- Rich Menu 管理<br>- 排程推播設定 |
| **V2.0** | 2026-02 | **模組管理介面**<br>- 模組啟用/停用<br>- 模組排序與外部連結設定 |
| **V1.0** | 2025-12 | **基礎管理後台**<br>- 傷口管理 Admin Dashboard<br>- 病患列表與時間軸 |

---

## 🏥 Portal 入口頁 (`/portal`)

**當前版本：V1.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V1.0** | 2025-11 | **統一入口頁面**<br>- 模組選擇導航<br>- 統一認證登入<br>- 動態模組卡片顯示 |

---

## 🎮 遊戲化平台系統

**當前版本：V2.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V2.0** | 2026-04 | **完整遊戲化生態**<br>- Streak 連續打卡系統<br>- Badge 徽章獲得系統<br>- Journey 旅程階段轉換<br>- User Attributes 屬性追蹤<br>- 自動化獎勵與通知 |
| **V1.0** | 2026-03 | **基礎積分系統**<br>- 任務完成積分<br>- 基礎徽章系統 |

---

## 📱 LINE Bot 整合平台

**當前版本：V4.0**

| 版本 | 發布日期 | 重點更新內容 |
| :--- | :--- | :--- |
| **V4.0** | 2026-05 | **智能對話與多產品支援**<br>- AI Skill Platform 整合<br>- LLM Fallback 機制<br>- Intent Rule 匹配引擎<br>- Rich Menu 自動切換（根據使用者屬性）<br>- CoBlocks 情境流程<br>- 多 OA、多 Product N:N 綁定<br>- 排程推播系統 |
| **V3.0** | 2026-03 | **Rich Menu 與情境管理**<br>- Rich Menu 模板管理<br>- 情境流程編輯器<br>- 使用者註冊與流程追蹤 |
| **V2.0** | 2026-02 | **Intent 規則引擎**<br>- 關鍵字匹配<br>- 內容項目回覆<br>- 設定屬性 action |
| **V1.0** | 2025-12 | **基礎 Webhook**<br>- 接收 LINE 訊息<br>- 簡單文字回覆<br>- LINE Push Message 推播 |

---

## 🏗️ 架構演進

### 資料庫

| 版本 | 日期 | 說明 |
| :--- | :--- | :--- |
| **Prisma Migration** | 2026-04 | 從手動 DDL 遷移至 Prisma ORM |
| **Multi-tenant Schema** | 2026-03 | 支援多 LINE OA 與多 Product 架構 |
| **Platform Tables** | 2026-02 | 新增 LINE OA、Product、Content 等平台管理表 |

### Backend 框架

| 版本 | 日期 | 說明 |
| :--- | :--- | :--- |
| **Fastify MVC** | 2026-05 | 完成 Hono 到 Fastify 遷移，採用 Controller-Service 架構 |
| **DI Container** | 2026-04 | 導入 Dependency Injection 容器管理服務實例 |
| **Hono.js** | 2025-11 | 原始框架，輕量快速 |

### 前端架構

| 版本 | 日期 | 說明 |
| :--- | :--- | :--- |
| **Monorepo** | 2026-02 | 拆分為 apps/ 與 packages/，共用 @vitera/lib 與 @vitera/ui |
| **Single App** | 2025-11 | 單一 Next.js App Router 專案 |

---

## 📋 開發者注意事項

- 當您完成一個 Module 層級的重大 Epic (例如 V3.x 升級) 時，請務必在此更新 Changelog。
- 小型的 Bug fixes 不需在此記錄，請善用 Git Commit History。
- 版本號規則：
  - **主版本 (Major)**：重大架構變更或新增核心功能
  - **次版本 (Minor)**：功能增強或重要特性添加
  - **修訂版本 (Patch)**：bug fixes（不記錄在此文件）

---

## 🔗 相關文件

- [Database Schema](./database-schema.md) — 完整資料庫 schema
- [API Endpoints](./api-endpoints.md) — 所有 API 端點
- [Architecture Overview](../explanation/architecture-overview.md) — 系統架構說明
