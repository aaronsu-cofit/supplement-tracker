# 足踝照護模組 (Foot Care Module) 架構說明

足踝照護模組 (`/bones`) 是 Health & Care 專案下重點發展的第三大防線模組，致力於結合 OMO (Online Merge Offline) 服務，透過數位檢測將有潛在足部問題（如拇趾外翻）的患者導引至實體診所或推薦適合的輔具。

---

## 1. 核心功能與頁面結構 (Frontend)

`/bones` 路由下包含了完整的個人化足部評估與歷史檢測流程：

| 路由路徑                 | 頁面用途                                                                 |
| :---                     | :---                                                                     |
| `/bones`                 | **主控台 (Dashboard)**：呈現最新一次檢測紀錄摘要、近期步數與久站指標。 |
| `/bones/assess`          | **痛點評估**：視覺化腳掌點擊器，收集足底筋膜炎等痛點位置及日常活動指標。 |
| `/bones/scan`            | **智能掃描 (WebRTC)**：自訂相機介面，疊加 SVG 導引線並包含即時影像擷取功能。 |
| `/bones/result?id=...`   | **AI 報告**：由 Gemini 分析產生的嚴重程度報告，並帶有動態繪製的骨骼角度與標註框 (Bounding Box)。|
| `/bones/history`         | **追蹤歷程**：以時間軸 (Timeline) 方式條列所有過去的檢測圖文紀錄。             |

---

## 2. 資料庫設計 (Database Schema)

資料主要儲存於 Neon Postgres 資料庫，並與使用者的主帳號綁定（`user_id`）。

### `foot_assessments` (日常評估)
- `id` (PK)
- `user_id` (FK)
- `date` (DATE) - 紀錄所屬日期
- `daily_steps` (INT) - 每日步數
- `standing_hours` (FLOAT) - 每日久站時數
- `pain_score` (INT) - 疼痛指數 0~10 (NRS)
- `pain_points` (JSONB) - 痛點陣列，例如 `['heel', 'arch', 'ball']`
- `created_at` (TIMESTAMP)

### `foot_images` (影像分析紀錄)
- `id` (PK)
- `user_id` (FK)
- `image_data` (TEXT) - 實作時先以 Base64 存放
- `ai_severity` (VARCHAR) - `normal`, `mild`, `moderate`, `severe`
- `ai_summary` (TEXT) - 醫師視角的衛教與診斷建議
- `ai_details` (JSONB) - 存放左腳與右腳的 Bounding Box 及角度座標。例如 `{"left_toe": {...}, "right_toe": {...}}`
- `created_at` (TIMESTAMP)

---

## 3. API 路由設計 (Backend)

| 路徑                              | 請求方法 | 用途描述                                                                 |
| :---                              | :---     | :---                                                                     |
| `/api/footcare/assessments`       | GET/POST | 處理 `foot_assessments` 資料，支援按日查詢或建立新評估。                     |
| `/api/footcare/images`            | GET/POST | 處理 `foot_images`，POST 負責接收 Base64 並存入 DB，GET 提供歷史列表或單筆查詢。 |
| `/api/analyze` (Shared)           | POST     | 透過 `mode: 'hallux_valgus'` 呼叫 Gemini 進行骨科視覺分析，產出 JSON 格式之結果。 |

### 3.1 AI Prompt 設計原則
在 `/api/analyze` 中，我們要求 Gemini 扮演專業骨科醫師。
為了在前端繪製精準的標籤塊，我們強制模型遵守特定的 JSON Schema 回傳結構：
- 只允許回傳嚴格的 JSON 格式。
- `left_toe` 與 `right_toe` 必須包含相對於原圖比例 (0.00 ~ 1.00) 的 `ymin`, `xmin`, `ymax`, `xmax` 座標池。

---

## 4. 特殊技術實作 (Features Highlight)

### 4.1 自訂 WebRTC 智能相機
為達成於掃描畫面疊加「雙腳發光輪廓導引線」的需求，此專案揚棄了 `<input type="file" capture="environment">`，自行呼叫 `navigator.mediaDevices.getUserMedia`。
- 專門針對 iOS Safari WKWebView 處理了許多自動播放 (`autoPlay`) 與權限限制的問題。詳細解法見 [`docs/explanation/webrtc-ios-quirks.md`](./webrtc-ios-quirks.md)。

### 4.2 視覺化 Bounding Box (前端疊加)
前端在拿到 AI 產出的 0.0 ~ 1.0 比例座標後，會利用 CSS Absolute Positioning 搭配 `calc()` 函數，動態在原圖上方渲染出帶有圓角、指定顏色（依照嚴重度不同而改變）的空心方塊與文字標籤。這大幅提高了診斷報告的說服力與醫療體感。

### 4.3 跨模組 Auth 與 LIFF
`bones` 路由與核心 `wounds` 同等收到 `AuthProvider` 及 `LiffProvider` 的保護。
其在 LINE 的環境下運作時，會讀取獨立環境變數 `NEXT_PUBLIC_LIFF_ID_BONES` 來辨識並進入對應的行銷入口，不干擾主醫療應用。
