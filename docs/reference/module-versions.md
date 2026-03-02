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

> **開發者注意事項：**
> - 當您完成一個 Module 層級的重大 Epic (例如 V3.x 升級) 時，請務必在此更新 Changelog。
> - 小型的 Bug fixes 不需在此記錄，請善用 Git Commit History。
