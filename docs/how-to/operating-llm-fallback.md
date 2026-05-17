# 操作 LLM Fallback 與對話審查

本指南說明日常 ops 場景：替一個新 OA 接上 AI Skill Platform、確認回應流程通了、之後從對話與 `unmatched_intents` 紀錄中找出該補成 Intent 規則的高頻問題。

> 這是 how-to。架構說明請看 [`reference/llm-architecture.md`](../reference/llm-architecture.md)。

---

## 1. 替 OA 接上 AI Skill Platform

### 1.1 前置條件

- 在 GCP 上的 AI Skill Platform 已部署，例如 staging 為 `https://ai-skill-platform-staging-burn2f7oaq-de.a.run.app`
- 該 platform 已建立你要用的 agent（例如 `nutrition_analyst`）
- 已有可呼叫該 platform 的 bearer token —— 由 platform 自己的 secret 簽出來，例如 warehouse 端執行：

  ```ruby
  Token.tokenize(some_member)  # 回一個 JWT 字串
  ```

  Vitera 收到這個 token 之後**只負責原封轉發**到 platform，不持有 secret、不重簽。

### 1.2 在 HQ 設定

進入 `HQ → LINE OA → 該 OA → Settings`：

| 欄位 | 範例 | 說明 |
|---|---|---|
| **Default Agent ID** | `nutrition_analyst` | 沒中 Intent 時 fallback 預設找哪個 agent。Scenario 內若有 `ai-skill-node` 會 per-day 蓋掉這個值 |
| **Platform URL** | `https://ai-skill-platform-staging-...run.app` | base URL，**不要帶 `/vitera/run`**，程式碼會自己接 |
| **Bearer Token** | `eyJhbGciOi...` | 上面用 `Token.tokenize` 產出的 JWT。留空＝不送 `Authorization` header。HQ 會顯示「✓ 目前已設定」綠標籤 |

填完按「儲存」。

### 1.3 端到端驗證

按該頁面的「**↻ 測連線**」按鈕：

- ✅ 綠燈 + 顯示 agent 真的回的字（例如「哈囉你好！我是你的專屬營養師…」）→ 全鏈路通
- ❌ 紅燈 + 401 `Missing or invalid Authorization header` → token 沒儲存或為空
- ❌ 紅燈 + 401 `Invalid token` → token 簽章 secret 跟 platform 對不上，請在 platform 同環境的 Rails 重產 token
- ❌ 紅燈 + 404 → URL 錯（檢查是不是錯帶了 `/vitera` 路徑）
- ❌ 紅燈 + 502 timeout → platform cold start，重試一次；持續逾時看 [troubleshooting.md](./troubleshooting.md)

「測連線」走的是跟 webhook fallback **完全相同**的程式路徑（同一個 `adkRun`），所以綠燈代表真實使用者也會拿到真實回應。

### 1.4 命令列 smoke 測試（可選）

如果想在 HQ 之外驗一個 token：

```bash
cd backend
ADK_BEARER_TOKEN="eyJhbGciOi..." \
  pnpm tsx scripts/smokeAdk.ts \
  https://ai-skill-platform-staging-...run.app \
  nutrition_analyst
```

---

## 2. 讀懂對話紀錄

`HQ → LINE OA → 該 OA → conversations` tab：

### 2.1 排序與分頁

- **新訊息在最上面**（DESC 排序，admin 多半關心最近）
- 預設一次載 50 則
- 卷到底點「↓ 載入更早訊息」按鈕續載

### 2.2 使用者列表

左側顯示 LINE display_name + 大頭貼。沒有 display_name 的會 fallback 截斷的 user_id。搜尋框可以同時搜「名字」或「user_id」。

### 2.3 訊息來源 badge

每則 outbound 訊息底下會顯示是誰送的：

| Badge | 顏色 | 意思 |
|---|---|---|
| 🎯 **意圖規則** | 綠 | 該訊息打到了某條 Intent rule，rule_id 顯示在 `·` 後面 |
| 🤖 **AI Fallback** | 紫 | 沒中 Intent → 走 LLM fallback；agent 名稱在 `·` 後面 |
| 🤖 AI Fallback · 🐢 **慢回應** | 紫＋琥珀 | LLM 超過 9 秒，改用 `pushText` 補送（會計入 push 配額） |
| 🤖 AI Fallback · ⚠ **錯誤** | 紫＋紅 | LLM 呼叫失敗，user 收到的是預設的「AI 顧問暫時無法回應」 |
| ⏰ **習慣提醒** | 琥珀 | habit reminder cron 自動推的 |
| 任務通知 / 徽章通知 / 排程推播 | 藍 / 琥珀 | 各自系統 push |

看「🤖 AI Fallback · 🐢 慢回應」如果頻率很高，代表 platform 那邊回應太慢，需要檢查 agent 的設定或 cold start。

---

## 3. 從 `unmatched_intents` 找新 Intent 候選

每一筆**沒中 Intent 的 inbound 訊息**都會記到 `unmatched_intents` 表，連同 LLM 的回應、agent、延遲、錯誤。Ops 用這個表找出「常被問但還沒設成 Intent 規則」的問題，把它升級成 Intent。

### 3.1 直接用 SQL 看

```sql
-- 最近 7 天，沒被標 resolved 的 unmatched 問題，按出現次數排序
SELECT
  message,
  COUNT(*) AS times_asked,
  COUNT(DISTINCT user_id) AS unique_users,
  AVG(latency_ms)::int AS avg_latency_ms,
  MAX(created_at) AS last_seen
FROM unmatched_intents
WHERE created_at > NOW() - INTERVAL '7 days'
  AND resolved = false
  AND error IS NULL
GROUP BY message
HAVING COUNT(*) >= 2
ORDER BY times_asked DESC, unique_users DESC
LIMIT 30;
```

```sql
-- 最近的錯誤（排查 platform 健康度）
SELECT created_at, agent_id, message, error, latency_ms
FROM unmatched_intents
WHERE error IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
```

### 3.2 把高頻問題升級成 Intent

1. 看 SQL 結果挑一句頻率最高的 message（例如「我想預約」出現 12 次）
2. 進 `HQ → 商品 → Intent 規則 → 新增規則`
3. 填 patterns（多寫幾個變體：「預約」「想預約」「掛號」⋯），action 填對應 reply_content
4. 啟用後到 staging LINE 試一次，確認新訊息會中你新增的 rule（對話 tab 會顯示 🎯 綠 badge）
5. 把對應的 `unmatched_intents` 紀錄標為 resolved：

   ```sql
   UPDATE unmatched_intents
   SET resolved = true
   WHERE oa_id = <oa_id> AND message = '我想預約';
   ```

   （這只是 ops 紀錄方便，邏輯上不影響任何行為。）

### 3.3 欄位含義

| 欄位 | 說明 |
|---|---|
| `user_id` | LINE userId |
| `oa_id` / `product_id` | 哪個 OA / 哪個產品 scope |
| `agent_id` | webhook 解析出的 agent（scenario phase 或 default） |
| `message` | user 原話（截斷 2000 字）|
| `reply` | LLM 回給 user 的字（成功時）|
| `skill_key` | platform 實際用的 skill（可能 ≠ agent_id 如果 platform 內部 routing） |
| `latency_ms` | 從 webhook 收到訊息到 LLM 回覆耗時 |
| `error` | 失敗訊息（成功則 null） |
| `resolved` | ops 標記用 |

---

## 4. 常見場景速查

| 症狀 | 可能原因 | 對策 |
|---|---|---|
| 用戶說的話沒人理 | webhook 沒部署 / OA 沒設 token / Platform URL 錯 | 進 Settings 按「↻ 測連線」 |
| 「測連線」過、用戶問還是沒回 | runIntent 中了 rule 但 rule 設定錯（沒回應）／OA `product_id` 沒設 | 看 conversations tab 該訊息的 badge —— 是不是綠 🎯 但 reply 為空？ |
| 大量「🤖 AI Fallback · 🐢 慢回應」 | platform agent 太慢 | platform 那邊優化 prompt / agent，或考慮拉長 fast-path window（[`webhook.routes.ts:FAST_PATH_MS`](../../backend/src/routes/webhook.routes.ts)） |
| 大量「⚠ 錯誤」 | platform 不穩 / token 過期 | 查 `unmatched_intents.error` 訊息；token 過期就重產貼回 OA Settings |
| 同一個問題反覆問 | 該升級成 Intent | 跑 §3.1 的 SQL，把高頻 message 變成新規則 |

---

## 5. 部署注意

- 改 OA Settings 的 token / URL → **立即生效**（每次 webhook 觸發都會從 DB 讀）
- 改 `lib/adk.ts` / `lib/llmFallback.ts` / `routes/webhook.routes.ts` → 需要 Cloud Run 部署生效
- migration `unmatched_intents` 表必須先 deploy（`prisma migrate deploy`），否則第一個 fallback 訊息會 crash
