# CoBlocks DTx 系統設計文件

**日期：** 2026-04-17  
**狀態：** Draft  
**受眾：** 工程師、Cofit 內部 DTx 設計者

---

## 一、系統定位與商業模式

### 產品定位

| 產品 | 定位 | 說明 |
|------|------|------|
| **Vitera** | Cofit 自有獨立 DTx 產品 | Wounds / Bones / Intimacy 等模組，Cofit 直接運營 |
| **CoBlocks** | B 端 DTx 平台 | 供 B 端客戶（診所 / 機構 / 企業）組合數位處方場景 |
| **Reference DTx** | CoBlocks 示範案例 | 需建立一套供 B 端參考的 DTx 場景展示 |

### 核心價值主張（對 B 端）

- **規模化照護**：一位專家服務更多客戶，AI 處理追蹤 / 推播 / 報告
- **免建技術**：不需要工程師，用積木拖拉組合 DTx 場景
- **提升黏著**：LINE 持續追蹤 + 習慣養成，提高客戶 LTV
- **可量化成效**：ADIME 框架天然支持成效數據，對企業 / 保險有說服力

### 商業模式

**分層訂閱（Tiered SaaS）**

| 方案 | 目標客群 | 包含功能 |
|------|---------|---------|
| Starter | 小診所 | 問卷、影音課程、基本 Messaging |
| Growth | 中型機構 | + AI Skill、習慣模組、排程推播 |
| Enterprise | 大型合作 | + 自訂 AI Skill、API 串接、專屬顧問 |

**Go-to-Market 策略**
- **前期**：Managed Service，Cofit 內部幫 B 端建立 DTx 場景
- **後期**：大客戶規模夠大時，提供自助平台授權

---

## 二、系統架構

### 三個核心系統

```
┌─────────────────────────────────────────────────────────┐
│  cofit/Vitera（LIFF 前端 + 模組資料後端）                │
│  • Portal / Wounds / Bones / Intimacy / HQ（演進中）     │
│  • Hono.js BE：所有 DTx 模組資料（現有 + 新積木）         │
│  • 習慣模組、未來新積木資料                               │
│  • LINE Bot Handler（橋接 AI Expert ↔ LINE Reply API）   │
│  • LINE OA / Rich Menu 管理                              │
│  • AI Expert 對話歷史                                    │
│  • 認證（LINE OAuth + email）                            │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│  ADK Service（AI Skill Runtime，GCP Cloud Run）           │
│  • 接收 /run_sse（LIFF）或同步 POST（LINE 聊天室）        │
│  • 從 Warehouse 讀取 Skill 設定（prompt / model / tools）│
│  • 依 context_source 路由資料來源                        │
│  • Google ADK → Gemini 執行                              │
│  • SSE stream 回傳（LIFF）/ 同步回傳（LINE 聊天室）       │
│  • 結果寫回對應來源（Vitera 或 Warehouse）                │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│  cofit/Warehouse（AI Skill 設定 + 舊有資料）              │
│  • AI Skill CRUD（prompt / model / tools / context_source）│
│  • Skill 版本管理                                        │
│  • Admin UI（非工程師可操作）                             │
│  • 舊有健康資料（歷史遺留，維持現狀）                     │
│  • Multi-provider 切換（OpenAI / Anthropic / Gemini）    │
└─────────────────────────────────────────────────────────┘
```

### 資料路由規則

每個 AI Skill 在 Warehouse 設定中定義 `context_source`：

| context_source | ADK 拿資料來源 | 結果寫回 |
|---------------|--------------|---------|
| `vitera` | Vitera BE | Vitera BE |
| `warehouse` | Warehouse | Warehouse |
| `both` | 兩者都拿 | 各自寫回 |

### 服務間認證

- 所有服務間呼叫使用 **API Key**
- Key 儲存於 **GCP Secret Manager**
- Header：`X-API-Key: {secret}`
- 未來可升級至 GCP Service Account + IAM

### Multi-tenancy

- 共用 PostgreSQL DB，每張資料表加 `organization_id` 欄位
- 所有查詢自動帶入 `organization_id` 隔離資料
- Enterprise 大客戶有合規需求時，可遷移至獨立 DB 實例

---

## 三、觸發流程

### LIFF 前端觸發（手動）

```
Vitera LIFF
  → POST /run_sse { agent_id, client_id }
  → ADK Service
    → GET Warehouse /v5/ai_skills/:key（Skill 設定）
    → GET context_data（依 context_source 路由）
    → Google ADK → Gemini
  → SSE stream 即時回傳 → LIFF 顯示
  → POST results → 對應來源儲存
```

### LINE 聊天室觸發（AI Expert）

```
用戶傳訊息給 LINE OA
  → LINE webhook → Vitera BE /webhook/line
  → 事件分流：
    ├─ postback / click → 直接回 LIFF 連結或固定訊息 → LINE Reply API
    └─ text message
         → POST /run { agent_id: "ai-expert", client_id, message }
         → ADK Service（同步，非 SSE）
         → 執行完回傳完整結果
         → Vitera BE LINE Bot Handler → LINE Reply API
```

> **備註：** ADK Service 需新增同步 POST endpoint（現有只有 SSE）

### 排程觸發

```
GCP Cloud Scheduler（定時）
  → POST Vitera BE /api/jobs/{job_name}
  → 查出所有目標 client_id
  → 逐一呼叫 ADK Service /run { agent_id, client_id }
  → 結果 → LINE Push API
```

### Event-driven 觸發

```
系統事件（諮詢完成 / 問卷提交 / 習慣打卡 / 時間軸節點達成）
  → Vitera BE async POST → ADK Service /run { agent_id, client_id }
  → 執行完 → LINE Push API 或寫回 DB
```

> **已定義事件：** `consultation.completed` / `survey.submitted` / `habit.checked_in` / `timeline.node_reached`  
> **未來：** 視業務需求持續新增，規模變大後可升級至 GCP Pub/Sub

---

## 四、LINE 整合

### 用戶端體驗

| 入口 | 技術 | 體驗 |
|------|------|------|
| LIFF | Web App in LINE | 問卷、打卡、查看紀錄、AI 互動介面 |
| LINE 聊天室 | Messaging API | Rich Menu 導航 + 自由文字交 AI Expert |

### Rich Menu 三層機制

用戶的 Rich Menu 為 **per-user 動態設計**，依以下優先順序決定：

1. **規則驅動**：設計者在 Wizard 中定義條件（如「Day 7 完成問卷 → 換 Menu B」），條件達成時 AI Skill（action type）自動切換
2. **AI 自動判斷**：規則未觸發時，AI Skill 分析用戶當前狀態（進度 / 最後打卡 / 完成模組），從 Menu 庫選出最適合的 Menu
3. **預設 Fallback**：規則和 AI 都未觸發時，使用預設 Menu

---

## 五、DTx 設計者操作體驗

### CoBlocks 後台（HQ 演進版）

HQ app 逐步演進成 CoBlocks 後台，現有功能重構對應：

| 現有 HQ 功能 | 演進成 |
|------------|-------|
| 模組開關 | 積木選擇（Wizard Step 3）|
| Rich Menu 設定 | Menu 庫設定（Wizard Step 4）|
| 管理員帳號 | 保留，加入 organization 層級 |

### DTx 場景建立 Wizard（7 步）

```
Step 1  建立客戶 / 組織資料
        → 客戶名稱、LINE OA 帳號、負責人、場景名稱

Step 2  選擇健康場景
        → 骨關節 / 女性賀爾蒙 / 代謝管理 / 睡眠 / 自訂...
        → 決定 ADIME 時間軸預設草稿

Step 3  選擇要啟用的積木
        → 問卷、影音課程、AI Expert、習慣模組（待建）、報表模組（待建）...
        → 新積木建好後直接加入清單，無需改 Wizard

Step 4  Rich Menu 庫設定
        → 定義各階段可用的 Menu 組合
        → 設定規則觸發條件（可選）
        → 未設定 = AI 自動判斷或 fallback 預設

Step 5  時間軸草稿確認與調整
        → 系統依場景自動生成 Day 0 → Day N 草稿
        → 設計者可拖拉節點、新增 / 刪除天數

Step 6  AI Skill & 推播設定
        → 每個時間軸節點選擇對應的 AI Skill
        → 設定推播時間 / 對象 / 固定或 AI 生成內容

Step 7  預覽 & 啟動
        → 模擬用戶 Day 0 → Day N 完整體驗
        → 確認無誤後啟動，自動部署 LINE Rich Menu
```

---

## 六、待辦與備註

| 項目 | 說明 | 優先度 |
|------|------|--------|
| ADK Service sync endpoint | 新增同步 POST /run（現有只有 SSE），LINE 場景需要 | P0 |
| LIFF → ADK 串接 | Vitera LIFF 加入呼叫 ADK Service 的 client 程式碼 | P0 |
| organization_id 加入 | Vitera DB 所有資料表加 organization_id，query 帶入條件 | P1 |
| HQ Wizard 重構 | HQ 前端逐步演進成 7 步 Wizard | P1 |
| Reference DTx | 建立一套供 B 端參考的示範 DTx 場景 | P2 |
| AI Rich Menu Skill | 實作 AI 自動判斷 per-user Rich Menu 的 AI Skill | P2 |
| Pub/Sub 升級 | Event-driven 規模變大後評估升級 GCP Pub/Sub | Future |
| Enterprise 獨立 DB | 大客戶有合規需求時遷移獨立 DB | Future |
