# Phase 1 + 2 測試計畫

驗證 Plan 14–20 改動：scheduler idempotency、timezone、retry、tests、enrollment 模型、rich message types、engagement tracking。

---

## 0. 環境前置

### Backend 需要的 env

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...    # 你的 LINE OA channel token
LINE_CHANNEL_SECRET=...
LINE_OA_ID=<LineOA.id 的數字>     # scheduler + webhook 都讀這個
ADK_URL=...
ADK_API_KEY=...
```

### 確認 3 個新 migrations 跑完

```sql
\dt
-- 應該看到：
--   enrollments
--   engagement_events
--   message_deliveries           (Plan 14 就有了)

\d users
-- 應該有 timezone 欄位，default 'Asia/Taipei'
```

---

## 1. 基本 sanity（不需 LINE）

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
pnpm --filter @vitera/backend exec tsc --noEmit    # 0 errors
pnpm --filter @vitera/hq exec tsc --noEmit         # 0 errors
pnpm --filter @vitera/backend test                 # 32 passed
```

---

## 2. Backfill 驗證（migration 是否正確）

Plan 18 migration 會把既有 LINE users × active scenarios 自動建成 enrollments。

```sql
-- 應該 = LINE users 數 × active scenarios 數（原本就有的那幾個）
SELECT COUNT(*) FROM enrollments;

-- 每筆的 enrolled_at 應該等於對應 user 的 created_at
SELECT
  e.user_id,
  e.enrolled_at AS enrollment_time,
  u.created_at AS user_follow_time,
  e.enrolled_at = u.created_at AS backfill_correct
FROM enrollments e
JOIN users u ON u.id = e.user_id
LIMIT 10;
-- backfill_correct 應該全部 true
```

---

## 3. 端到端 happy path

這條測完 = Phase 1+2 整個 flow 能動。

### 3.1 準備資料

1. HQ 登入 `/lineoamenu`
2. 建一個 LINE OA（如果還沒有），記下它的 `id`（就是 `LINE_OA_ID`）
3. Wizard 選這個 OA，建一個新 scenario：
   - Day 0 → PushMessage（Type = Text，Message = `測試 Day 0 收到`）
   - Day 1 → PushMessage（Type = Text，Message = `測試 Day 1 收到`）
4. 存檔 → 點 ● 啟用

### 3.2 確認 enrollment 建起來了（Plan 18）

```sql
SELECT user_id, scenario_id, enrolled_at, status
FROM enrollments
WHERE scenario_id = '<剛建的 scenario id>';
```

預期：每個 LINE 使用者都有一筆，`enrolled_at` = 按啟用的那個瞬間。

### 3.3 第一次執行推播

HQ Overview → 「執行推播」

**預期結果：**
- 今天是 user follow 當天 → `daysSinceEnrollment` 看 tz 算出 0 → 只有 Day 0 會觸發
- `sent` = 當下 LINE users 數
- `skipped` = 0（第一次）
- `enrollmentsConsidered` = enrollments 總數
- 你的 LINE 會收到「測試 Day 0 收到」

### 3.4 驗 idempotency（Plan 14）

**立刻再按一次「執行推播」**

**預期：**
- `sent` = 0
- `skipped` = 剛才 sent 的數量
- LINE **不會**再收一次

```sql
SELECT COUNT(*) FROM message_deliveries
WHERE scenario_id = '<scenario id>';
-- 應該 = 上一步 sent 的數量，沒有增加
```

---

## 4. Plan 15 — Timezone

改一個測試 user 的 timezone 到跨日的時區：

```sql
UPDATE users SET timezone = 'Pacific/Kiritimati' WHERE id = '<某個測試 LINE user>';
-- Kiritimati 是 UTC+14，台北 UTC+8。兩邊差 6 小時。
```

### 比較容易驗的做法

手動把 enrollment 的 enrolled_at 推回去，比較兩個 timezone 的 Day N 計算差異：

```sql
-- 推回 16 小時前
UPDATE enrollments SET enrolled_at = NOW() - INTERVAL '16 hours'
WHERE user_id = '<test user>' AND scenario_id = '<scenario id>';
```

- 在 `Asia/Taipei`（UTC+8）時區下，enrolled_at 可能是昨天晚上 → Day N = 1 或 0 視時刻而定
- 在 `Pacific/Kiritimati`（UTC+14）時區下，enrolled_at 可能是同一天 → Day N 會不同

執行推播兩次（一次 timezone='Asia/Taipei'，一次 timezone='Pacific/Kiritimati'），觀察 `daysSinceEnrollment` 行為差異。

---

## 5. Plan 19 — Rich message types

### 5.1 Text（基線）

已在 Step 3 測過。

### 5.2 Image

1. Wizard 加 PushMessage，Type = **Image**
2. Image URL 填 `https://picsum.photos/400`（必須是 HTTPS）
3. 連到對應的 Day 節點
4. 手動調 enrollment.enrolled_at 讓 Day N 對上
5. 執行推播 → LINE 收到圖片

### 5.3 Sticker

1. Type = **Sticker**
2. Package ID = `446`, Sticker ID = `1988`（LINE 免費 sticker）
3. 同上流程
4. 執行推播 → LINE 收到那張貼圖

### 5.4 缺欄位驗證

Type = Image 但 Image URL 不填 → 執行推播 → errors 裡會看到：

```
user=U_xxx node=push-message-node-N: skipped (missing required fields for type=image)
```

不會爆，只會在 errors 列出來。

---

## 6. Plan 20 — Engagement tracking

### 6.1 Text reply

1. 用 LINE 傳一則訊息給 OA（任何文字）
2. 等 AI Expert 回覆你
3. 驗證 DB：

```sql
SELECT event_type, payload, occurred_at
FROM engagement_events
WHERE user_id = '<你的 LINE user id>'
ORDER BY occurred_at DESC
LIMIT 3;
```

預期：看到 `event_type='text_reply'`，`payload=你剛傳的訊息`。

### 6.2 Overview 顯示

HQ Overview → 第 4 張卡片「近 7 日分配 / 互動」→ `/` 右邊的數字應該 +1。

### 6.3 Postback（需 postback button）

目前 Wizard 不會產出 postback button，所以這塊只能間接驗：
- Rich Menu 如果有 postback zone，點下去 → `engagement_events` 會有 `event_type='postback'`

---

## 7. Plan 18 — 新 user follow 自動 enroll

1. 用一個**從來沒 follow 過**這個 OA 的 LINE 帳號去 follow
2. 驗證 DB：

```sql
SELECT * FROM enrollments
WHERE user_id = '<新 user 的 line user id>'
ORDER BY enrolled_at DESC;
```

預期：新 user 為每個 active scenario 都有一筆 enrollment，`enrolled_at` 約等於 follow 時間。

3. 立刻執行推播 → 新 user 會收到 Day 0 訊息

---

## 8. Plan 13 — Role gating regression

確認 HQ auth hardening 沒被 phase 1+2 弄壞：

```bash
# 用 role=user 的帳號（不是你）訪問 /api/hq/stats
# 應該 403
```

或在 HQ 登入 user role 帳號，看 `/` Overview 會不會顯示「無法載入統計資料」。

---

## 9. Regression 檢查清單

確認這些**舊功能**沒壞：

- [ ] HQ Overview 載入（4 張 metric 卡 + 執行推播區 + 2 個 placeholder）
- [ ] HQ Admins 頁面列出使用者
- [ ] HQ Modules 頁面可改設定
- [ ] `/lineoamenu` 能 CRUD OA 跟 templates
- [ ] Wizard：OA dropdown、scenario tabs、畫布 drag-drop、節點選取、ConfigPanel
- [ ] Wizard：Save（按鈕 + Cmd+S）、Activate（● 按鈕）、Duplicate（⎘）、Delete（✕）
- [ ] Wizard：MenuChange 節點 menu name dropdown 正常顯示、警告有效
- [ ] 側邊欄 collapse 還會動

---

## 10. 回滾計畫（萬一爛了）

```bash
# 回到 Plan 13 最後一個乾淨狀態
git -C /Users/pochunlei/Projects/cofit/Vitera log --oneline | grep "chore(hq): remove unused HQMetric"
# 拿到那個 SHA
git reset --hard <那個 SHA>
git push --force origin main staging   # 需要手動 confirm
```

Migrations 需要手動 rollback：

```sql
DROP TABLE engagement_events;
DROP TABLE enrollments;
ALTER TABLE users DROP COLUMN timezone;
-- message_deliveries 跟相關 column 保留（Plan 14 只是邏輯改動）
```

---

## 關鍵檢查點總整理

| 檢查點 | 怎麼驗 | 預期 |
|--------|--------|------|
| Enrollment backfill | SQL 比 `enrolled_at = created_at` | 全 true |
| Idempotency | 連按兩次「執行推播」 | 第二次 sent=0 |
| Text push | Day 0 連到 PushMessage(text) | LINE 收到文字 |
| Image push | Type=Image, https URL | LINE 收到圖 |
| Sticker push | Type=Sticker, 446/1988 | LINE 收到貼圖 |
| 缺欄位 | Type=Image 但沒 URL | errors 列出，不爆 |
| Auto-enroll | 新帳號 follow | enrollment 自動建 |
| Engagement log | LINE 傳文字 | engagement_events +1 |
| Overview 數字 | 7 日 engagement count | 顯示正確 |
