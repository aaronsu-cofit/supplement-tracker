# Plan 2: LINE Bot Handler — AI Expert Webhook

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 LINE 用戶傳文字訊息給 LINE OA 時，Vitera BE 接收 webhook、呼叫 ADK Service 取得 AI Expert 回覆，並透過 LINE Reply API 即時回覆。

**Architecture:** `POST /webhook/line` 接收 LINE webhook events，驗證 X-Line-Signature 後立即回 200 OK，再非同步處理：text message 呼叫 `adkRun('ai-expert', lineUserId, { message })` → 結果透過 LINE Reply API 回覆；follow event 回覆歡迎訊息；其他 event 靜默忽略。LINE user ID 直接當 `client_id` 傳給 ADK Service（和 Vitera DB 的 user ID 相同）。

**Tech Stack:** Hono.js（Vitera BE）、`@line/bot-sdk` v10（已安裝）、Node.js `crypto`（HMAC 簽名驗證）、`adkRun` from Plan 1

---

## 背景說明（給新進工程師）

### Vitera 現有 LINE 架構

Vitera BE 已有：
- `backend/src/routes/lineoa.ts` — LINE OA 管理、Rich Menu 部署（需 auth）
- `backend/src/routes/richmenu.ts` — Rich Menu 部署（需 auth）
- `@line/bot-sdk` v10 已安裝
- `findOrCreateLineUser(lineUserId, displayName, pictureUrl)` 在 `backend/src/lib/db.ts` — LINE 用戶 ID 直接用作 Vitera user ID（`users` table 的 `id` 欄位）

### LINE Webhook 工作流程

LINE 伺服器在用戶傳訊息時 POST 到你設定的 webhook URL，需：
1. 在 5 秒內回 200 OK（否則 LINE 重送）
2. 驗證 `X-Line-Signature` header（HMAC-SHA256 用 `LINE_CHANNEL_SECRET` 簽名）
3. 處理 events（可在回 200 後非同步處理）

### Plan 1 遺留的問題

Plan 1 的 `/api/ai/run` route 用 `authMiddleware`（需要 JWT），webhook handler 是 LINE Server 呼叫的，沒有 JWT。  
**解法：** webhook handler 直接呼叫 `adkRun()` lib function，不透過 `/api/ai/run` 中間層。

### ADK Service message 傳遞

現有 `adkRun(agentId, clientId)` 不傳 message text。AI Expert 需要知道用戶說了什麼，所以 Plan 2 擴充 `adkRun` 支援 optional `message` 欄位：

```
POST ADK /run
Body: { agent_id: "ai-expert", client_id: "U1234...", message: "我最近傷口有點紅腫" }
```

ADK Service 的 Task 1（另一個 repo）需同步更新以接受 `message` 欄位。

---

## 檔案地圖

| 狀態 | 檔案 | 說明 |
|------|------|------|
| **新增** | `backend/src/lib/line.ts` | LINE 工具：signature 驗證、Reply API wrapper |
| **新增** | `backend/src/routes/webhook.ts` | POST /webhook/line：事件接收、分流、AI Expert 呼叫 |
| **修改** | `backend/src/lib/adk.ts` | `adkRun` 加入 optional `message` 參數 |
| **修改** | `backend/src/index.ts` | 註冊 `/webhook/line` route |
| **修改** | `backend/.env.example` | 新增 `LINE_CHANNEL_SECRET` |

---

## Task 1：LINE Helper Lib + 環境變數

**Files:**
- 新增：`backend/src/lib/line.ts`
- 修改：`backend/.env.example`

### Step 1: 在 `backend/.env.example` 加入 LINE_CHANNEL_SECRET

讀取現有 `.env.example`，在 `LINE_CHANNEL_ACCESS_TOKEN` 那行後面加入：

```
LINE_CHANNEL_SECRET=your-line-channel-secret
```

完整 LINE 區塊應如下：
```
# LINE
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

同樣在本地 `backend/.env` 加入實際值（不 commit）：
```
LINE_CHANNEL_SECRET=<從 LINE Developers Console 取得>
```

### Step 2: 新增 `backend/src/lib/line.ts`

```typescript
import { createHmac } from 'crypto'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET

if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_CHANNEL_SECRET) {
  throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be set')
}

export function verifyLineSignature(body: string, signature: string): boolean {
  const expected = createHmac('sha256', LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return expected === signature
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`LINE reply failed ${res.status}: ${err}`)
  }
}
```

### Step 3: TypeScript check

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
pnpm --filter @vitera/backend tsc --noEmit
```

Expected: no new errors.

### Step 4: Commit

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
git add backend/src/lib/line.ts backend/.env.example
git commit -m "feat: add LINE helper lib and LINE_CHANNEL_SECRET env var"
```

---

## Task 2：擴充 adkRun 支援 message 參數

**Files:**
- 修改：`backend/src/lib/adk.ts`

### Step 1: 讀取現有 adk.ts

讀取 `backend/src/lib/adk.ts`，找到 `adkRun` 函式。

### Step 2: 修改 `adkRun` 函式加入 options 參數

將整個 `adkRun` 函式替換為：

```typescript
// 同步呼叫 ADK Service，等待完整結果（用於 LINE 聊天室）
export async function adkRun(
  agentId: string,
  clientId: string,
  options?: { message?: string }
): Promise<AdkRunResult> {
  const res = await fetch(`${ADK_URL}/run`, {
    method: 'POST',
    headers: ADK_HEADERS,
    body: JSON.stringify({
      agent_id: agentId,
      client_id: clientId,
      ...(options?.message !== undefined && { message: options.message }),
    }),
    signal: AbortSignal.timeout(9000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service error ${res.status}: ${err}`)
  }

  return res.json() as Promise<AdkRunResult>
}
```

注意：現有呼叫 `adkRun(agentId, clientId)` 不傳 options，保持向後相容。

### Step 3: TypeScript check

```bash
pnpm --filter @vitera/backend tsc --noEmit
```

Expected: no errors.

### Step 4: Commit

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
git add backend/src/lib/adk.ts
git commit -m "feat: extend adkRun to pass optional message to ADK Service"
```

---

## Task 3：Webhook Route

**Files:**
- 新增：`backend/src/routes/webhook.ts`
- 修改：`backend/src/index.ts`

### Step 1: 了解 LINE Webhook event 型別

LINE webhook payload 結構（`@line/bot-sdk` v10 型別 / LINE 官方文件）：

```typescript
// 最小化型別定義，只用到我們需要的欄位
interface LineSource {
  type: 'user' | 'group' | 'room'
  userId?: string
}

interface LineTextMessage {
  type: 'text'
  text: string
}

interface LineWebhookEvent {
  type: string           // 'message' | 'follow' | 'unfollow' | 'postback' | ...
  replyToken?: string    // 只有可回覆的 event 才有
  source: LineSource
  message?: LineTextMessage  // 只有 type: 'message' 才有
}

interface LineWebhookPayload {
  destination: string
  events: LineWebhookEvent[]
}
```

### Step 2: 新增 `backend/src/routes/webhook.ts`

```typescript
import { Hono } from 'hono'
import { verifyLineSignature, replyText } from '../lib/line.js'
import { adkRun } from '../lib/adk.js'
import { findOrCreateLineUser } from '../lib/db.js'

const webhook = new Hono()

interface LineSource {
  type: 'user' | 'group' | 'room'
  userId?: string
}

interface LineTextMessage {
  type: 'text'
  text: string
}

interface LineWebhookEvent {
  type: string
  replyToken?: string
  source: LineSource
  message?: LineTextMessage
}

interface LineWebhookPayload {
  destination: string
  events: LineWebhookEvent[]
}

async function handleLineEvent(event: LineWebhookEvent): Promise<void> {
  const lineUserId = event.source.userId
  if (!lineUserId) return

  if (event.type === 'follow') {
    await findOrCreateLineUser(lineUserId)
    if (event.replyToken) {
      await replyText(event.replyToken, '您好！我是您的 AI 健康顧問，有任何問題都可以直接傳訊問我 😊')
    }
    return
  }

  if (event.type === 'postback' && event.replyToken) {
    // Postback events (Rich Menu button clicks, Quick Reply) — reply with main LIFF entry
    const liffUrl = process.env.LIFF_URL_MAIN || process.env.LIFF_URL_WOUNDS || ''
    if (liffUrl) {
      await replyText(event.replyToken, `點這裡開啟健康紀錄：${liffUrl}`)
    }
    return
  }

  if (event.type === 'message' && event.message?.type === 'text' && event.replyToken) {
    const messageText = event.message.text
    await findOrCreateLineUser(lineUserId)

    try {
      const result = await adkRun('ai-expert', lineUserId, { message: messageText })
      await replyText(event.replyToken, result.result)
    } catch (err) {
      console.error('[webhook/line] AI Expert error:', err)
      await replyText(event.replyToken, '很抱歉，AI 顧問暫時無法回應，請稍後再試 🙏')
    }
  }
}

// POST /webhook/line
webhook.post('/line', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-line-signature') || ''

  if (!verifyLineSignature(body, signature)) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  let payload: LineWebhookPayload
  try {
    payload = JSON.parse(body) as LineWebhookPayload
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // 立即回 200，非同步處理 events（避免 LINE retry）
  for (const event of payload.events) {
    handleLineEvent(event).catch(err => console.error('[webhook/line] event error:', err))
  }

  return c.text('OK', 200)
})

export default webhook
```

### Step 3: 在 `backend/src/index.ts` 註冊 webhook route

讀取現有 `index.ts`，在 import 區加入：
```typescript
import webhookRoutes from './routes/webhook.js';
```

在 route 註冊區加入（放在其他 `app.route()` 之後）：
```typescript
app.route('/webhook', webhookRoutes);
```

完整的 webhook URL 為：`https://your-backend.run.app/webhook/line`

### Step 4: TypeScript check

```bash
pnpm --filter @vitera/backend tsc --noEmit
```

Expected: no new errors.

### Step 5: 手動測試 signature 驗證（不需要真的 LINE 呼叫）

在 local dev server 跑起來後，用錯誤 signature 測試回 401：

```bash
curl -s -X POST http://localhost:8080/webhook/line \
  -H "Content-Type: application/json" \
  -H "x-line-signature: invalid" \
  -d '{"destination":"U123","events":[]}'
# Expected: {"error":"Invalid signature"}
```

用正確 signature 測試（body 為空 events）：
```bash
# 計算正確 signature（Node.js）
node -e "
const { createHmac } = require('crypto');
const body = '{\"destination\":\"U123\",\"events\":[]}';
const secret = process.env.LINE_CHANNEL_SECRET;
const sig = createHmac('sha256', secret).update(body).digest('base64');
console.log('X-Line-Signature:', sig);
"
# 然後用這個 sig 發 request：
curl -s -X POST http://localhost:8080/webhook/line \
  -H "Content-Type: application/json" \
  -H "x-line-signature: <上面算出的 sig>" \
  -d '{"destination":"U123","events":[]}'
# Expected: OK
```

### Step 6: Commit

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
git add backend/src/routes/webhook.ts backend/src/index.ts
git commit -m "feat: add LINE webhook handler with AI Expert text reply"
```

---

## Task 4：End-to-End 測試與 LINE Developers 設定

**Files:** 無程式碼變更，只有設定與測試。

### Step 1: 確認所有 env vars 存在

`backend/.env` 應包含：
```
LINE_CHANNEL_ACCESS_TOKEN=<從 LINE Developers Console 取得>
LINE_CHANNEL_SECRET=<從 LINE Developers Console 取得>
ADK_URL=https://adk-service-xxx-uc.a.run.app
ADK_API_KEY=<從 GCP Secret Manager 取得>
LIFF_URL_MAIN=<LIFF 主入口 URL，用於 postback 回覆>
```

`backend/.env.example` 也補入 `LIFF_URL_MAIN`（在 LINE 區塊後面加）：
```
LIFF_URL_MAIN=https://liff.line.me/your-liff-id
```

### Step 2: 確認 ADK Service 已有 `ai-expert` skill

在 Warehouse admin UI 確認有一個 `agent_id = "ai-expert"` 的 AI Skill，且 ADK Service 的 `/run` endpoint 有接受 `message` 欄位（需 ADK Service Task 1 + 擴充）。

### Step 3: 設定 LINE Developers 的 webhook URL

1. 登入 [LINE Developers Console](https://developers.line.biz/)
2. 選擇你的 Messaging API channel
3. 在 **Messaging API** tab → **Webhook URL** 填入：
   ```
   https://your-vitera-backend.run.app/webhook/line
   ```
4. 開啟 **Use webhook** toggle
5. 點 **Verify** 確認 webhook 可連

### Step 4: 在 LINE 對話測試

1. 加入測試用的 LINE OA 為好友
2. 發送文字訊息：`你好，我的傷口最近有點紅腫`
3. 確認 AI Expert 回覆出現在 LINE 聊天室內
4. 確認 Vitera BE logs 沒有 error

### Step 5: 測試 follow event

1. 把 LINE OA 從好友移除再重加
2. 確認收到歡迎訊息：`您好！我是您的 AI 健康顧問，有任何問題都可以直接傳訊問我 😊`

### Step 6: Commit（若 .env.example 有補充）

如果在測試中發現需要補充任何 env var，更新 `.env.example` 並 commit：

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
git add backend/.env.example
git commit -m "chore: update .env.example with LINE webhook env vars"
```

---

## Self-Review 清單

完成所有 task 後，驗證以下項目：

- [ ] `pnpm --filter @vitera/backend tsc --noEmit` — 0 errors
- [ ] 帶錯誤 signature 的 webhook 請求回 401
- [ ] 帶正確 signature 的 empty events 請求回 200 OK
- [ ] LINE 聊天室傳訊息 → 收到 AI Expert 回覆
- [ ] LINE OA 加好友 → 收到歡迎訊息
- [ ] `adkRun` 的既有呼叫（無 options）仍正常運作（向後相容）

## 已知限制（production 前需解決）

1. **AI Expert 錯誤時只有 fallback 訊息** — `adkRun` 拋 error 時會回覆 fallback 文字，但 replyToken 仍被消耗（每個 replyToken 只能用一次）
2. **無對話歷史** — 每次呼叫都是無狀態的 `/run`，AI Expert 無法記住上下文。完整的對話體驗需要在 ADK Service 層實作對話狀態管理
3. **LINE Channel 是單一 OA** — 本 Plan 用全域 `LINE_CHANNEL_ACCESS_TOKEN`，未來多 OA 時需從 DB 查對應 OA 的 token（如 `lineoa.ts` 的模式）
