# Plan 1: ADK Integration — Vitera LIFF ↔ ADK Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Vitera LIFF 前端可以呼叫 ADK Service 執行 AI Skill，並讓 LINE 聊天室場景可以用同步方式拿到結果。

**Architecture:** Vitera BE 新增 `/api/ai/run`（同步）和 `/api/ai/stream`（SSE）兩個 proxy 端點，負責驗證身份後轉發到 ADK Service。LIFF 前端透過 `@vitera/lib` 的新 helper 呼叫這兩個端點，不直接接觸 ADK Service URL 或 API Key。

**Tech Stack:** Hono.js（Vitera BE）、Google ADK（ADK Service，另一個 repo）、TypeScript、EventSource API（SSE）、GCP Secret Manager（API Key 儲存）

---

## 背景說明（給新進工程師）

### 現有架構

目前 Vitera LIFF 的 AI 分析直接在 Vitera BE 的 `/api/analyze` 完成（`backend/src/routes/analyze.ts`），Hono 後端直接打 Gemini API。

### 新架構目標

AI 執行移到獨立的 ADK Service（另一個 GCP Cloud Run）。Vitera BE 改為 proxy，LIFF 不知道 ADK Service 的存在。

```
Vitera LIFF
  → apiFetch('/api/ai/stream', { agent_id, client_id })
  → Vitera BE /api/ai/stream
    → ADK Service POST /run_sse  (帶 X-API-Key header)
  → SSE stream 回傳 → LIFF 顯示

LINE Bot Handler（未來 Plan 2）
  → Vitera BE /api/ai/run  （同步）
  → ADK Service POST /run
  → { result } 回傳
```

### ADK Service API（已設計，另一個 repo 實作）

```
# 現有（SSE 串流）
POST /run_sse
Body: { agent_id: string, client_id: string }
Response: text/event-stream
  data: { chunk: "..." }
  data: [DONE]

# 新增（同步，本 plan 的 Task 1）
POST /run
Body: { agent_id: string, client_id: string }
Response: { result: string, skill_key: string }
```

---

## 檔案地圖

| 狀態 | 檔案 | 說明 |
|------|------|------|
| **新增** | `backend/src/lib/adk.ts` | ADK Service 的 HTTP client，管理 API Key 和重試 |
| **新增** | `backend/src/routes/ai.ts` | Hono routes：`/api/ai/run` 和 `/api/ai/stream` |
| **修改** | `backend/src/index.ts` | 註冊新 route |
| **修改** | `backend/.env.example` | 新增 `ADK_URL`、`ADK_API_KEY` |
| **新增** | `packages/lib/src/ai.ts` | 前端 helper：`aiRun()`、`aiStream()` |
| **修改** | `packages/lib/src/index.ts` | export 新 helpers |
| **修改** | `apps/wounds/src/app/scan/page.tsx` | POC：改用 `aiStream()` 取代 `/api/analyze` |

**ADK Service repo（另一個 repo，Task 1 在那邊做）：**

| 狀態 | 檔案 | 說明 |
|------|------|------|
| **新增** | `src/routes/run.ts`（或對應結構）| 同步 POST `/run` endpoint |

---

## Task 1：ADK Service — 新增同步 POST /run endpoint

> ⚠️ 這個 task 在 **ADK Service repo**（不是 Vitera），請切換到那個 repo 執行。

**Files（ADK Service repo）:**
- 新增：`src/routes/run.ts`（或依該 repo 的路由結構放置）

ADK Service 目前只有 `/run_sse`（SSE 串流）。LINE 聊天室需要同步回傳，不能用 SSE，所以要新增一個 `/run` endpoint，執行完整 Skill 後一次回傳結果。

- [ ] **Step 1: 在 ADK Service repo 新增同步 route**

```typescript
// src/routes/run.ts（ADK Service repo）
import { Hono } from 'hono'  // 或該 repo 使用的 framework

const run = new Hono()

run.post('/', async (c) => {
  const { agent_id, client_id } = await c.req.json()

  if (!agent_id || !client_id) {
    return c.json({ error: 'agent_id and client_id are required' }, 400)
  }

  // 驗證 API Key
  const apiKey = c.req.header('X-API-Key')
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    // 1. 從 Warehouse 拿 Skill 設定（同現有 /run_sse 邏輯）
    const skill = await fetchSkillConfig(agent_id)

    // 2. 從對應來源拿 context_data（依 skill.context_source）
    const context = await fetchContextData(skill, client_id)

    // 3. 用 ADK 執行 Gemini（同步，等待完整結果）
    const result = await runSkillSync(skill, context)

    // 4. 把結果寫回來源
    await saveResult(skill, client_id, result)

    return c.json({ result, skill_key: skill.key })
  } catch (err) {
    return c.json({ error: 'Skill execution failed', detail: String(err) }, 500)
  }
})

export default run
```

- [ ] **Step 2: 在 ADK Service 主入口註冊新 route**

```typescript
// src/index.ts（ADK Service repo，找到 app.route 的位置加入）
import run from './routes/run'
app.route('/run', run)
```

- [ ] **Step 3: 在 ADK Service 本地手動測試**

```bash
# 確保 ADK Service 在 local 跑起來後：
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{"agent_id": "client-survey-summary", "client_id": "123"}'
# Expected: { "result": "...", "skill_key": "client-survey-summary" }
```

- [ ] **Step 4: Commit（ADK Service repo）**

```bash
git add src/routes/run.ts src/index.ts
git commit -m "feat: add sync POST /run endpoint for LINE messaging use case"
```

---

## Task 2：Vitera BE — ADK Client lib

**Files:**
- 新增：`backend/src/lib/adk.ts`
- 修改：`backend/.env.example`

- [ ] **Step 1: 新增 ADK_URL 和 ADK_API_KEY 到 env**

在 `backend/.env.example` 加入：
```
ADK_URL=http://localhost:8080
ADK_API_KEY=your-adk-api-key
```

在 `backend/.env`（本地開發用，不 commit）加入實際值：
```
ADK_URL=https://adk-service-xxx-uc.a.run.app
ADK_API_KEY=<從 GCP Secret Manager 拿>
```

- [ ] **Step 2: 新增 `backend/src/lib/adk.ts`**

```typescript
// backend/src/lib/adk.ts
const ADK_URL = process.env.ADK_URL!
const ADK_API_KEY = process.env.ADK_API_KEY!

if (!ADK_URL || !ADK_API_KEY) {
  throw new Error('ADK_URL and ADK_API_KEY must be set')
}

const ADK_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': ADK_API_KEY,
}

export interface AdkRunResult {
  result: string
  skill_key: string
}

// 同步呼叫 ADK Service，等待完整結果（用於 LINE 聊天室）
export async function adkRun(agentId: string, clientId: string): Promise<AdkRunResult> {
  const res = await fetch(`${ADK_URL}/run`, {
    method: 'POST',
    headers: ADK_HEADERS,
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service error ${res.status}: ${err}`)
  }

  return res.json() as Promise<AdkRunResult>
}

// 取得 ADK Service 的 SSE stream（用於 LIFF 串流顯示）
export function adkStream(agentId: string, clientId: string): Promise<Response> {
  return fetch(`${ADK_URL}/run_sse`, {
    method: 'POST',
    headers: ADK_HEADERS,
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
  })
}
```

- [ ] **Step 3: 確認 TypeScript 編譯沒有錯誤**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
pnpm --filter @vitera/backend tsc --noEmit
# Expected: 沒有 error 輸出
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/adk.ts backend/.env.example
git commit -m "feat: add ADK Service client lib to Vitera BE"
```

---

## Task 3：Vitera BE — 新增 /api/ai proxy routes

**Files:**
- 新增：`backend/src/routes/ai.ts`
- 修改：`backend/src/index.ts`

- [ ] **Step 1: 新增 `backend/src/routes/ai.ts`**

```typescript
// backend/src/routes/ai.ts
import { Hono } from 'hono'
import { adkRun, adkStream } from '../lib/adk'
import { authMiddleware } from '../middleware/auth'

const ai = new Hono()

ai.use('*', authMiddleware)

// 同步執行 AI Skill（LINE 聊天室用）
ai.post('/run', async (c) => {
  const user = c.get('user')
  const { agent_id } = await c.req.json()

  if (!agent_id) {
    return c.json({ error: 'agent_id is required' }, 400)
  }

  try {
    const result = await adkRun(agent_id, String(user.id))
    return c.json(result)
  } catch (err) {
    console.error('[AI /run]', err)
    return c.json({ error: 'AI execution failed' }, 500)
  }
})

// SSE 串流執行 AI Skill（LIFF 用）
ai.post('/stream', async (c) => {
  const user = c.get('user')
  const { agent_id } = await c.req.json()

  if (!agent_id) {
    return c.json({ error: 'agent_id is required' }, 400)
  }

  try {
    const upstream = await adkStream(agent_id, String(user.id))

    if (!upstream.ok || !upstream.body) {
      return c.json({ error: 'ADK stream failed' }, 502)
    }

    // 把 ADK 的 SSE stream 直接 pipe 回前端
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[AI /stream]', err)
    return c.json({ error: 'AI stream failed' }, 500)
  }
})

export default ai
```

- [ ] **Step 2: 在 `backend/src/index.ts` 註冊新 route**

找到其他 route 的 import 位置，加入：
```typescript
import ai from './routes/ai'
// 在其他 app.route() 的地方加：
app.route('/api/ai', ai)
```

- [ ] **Step 3: 確認 TypeScript 編譯沒有錯誤**

```bash
pnpm --filter @vitera/backend tsc --noEmit
# Expected: 沒有 error 輸出
```

- [ ] **Step 4: 本地啟動 BE 測試 /api/ai/run 端點**

先確保有登入 session（或用 test user），然後：
```bash
# 先取得 auth cookie，再測試：
curl -X POST http://localhost:8080/api/ai/run \
  -H "Content-Type: application/json" \
  -b "auth_token=<your-local-token>" \
  -d '{"agent_id": "client-survey-summary"}'
# Expected: { "result": "...", "skill_key": "client-survey-summary" }
# （ADK Service 要同時跑起來）
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/ai.ts backend/src/index.ts
git commit -m "feat: add /api/ai/run and /api/ai/stream proxy routes to Vitera BE"
```

---

## Task 4：@vitera/lib — 前端 AI helper

**Files:**
- 新增：`packages/lib/src/ai.ts`
- 修改：`packages/lib/src/index.ts`

- [ ] **Step 1: 新增 `packages/lib/src/ai.ts`**

```typescript
// packages/lib/src/ai.ts
import { apiFetch } from './api'

export interface AiRunResult {
  result: string
  skill_key: string
}

// 同步呼叫 AI Skill，等完整結果
export async function aiRun(agentId: string): Promise<AiRunResult> {
  const res = await apiFetch('/api/ai/run', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId }),
  })

  if (!res.ok) {
    throw new Error(`AI run failed: ${res.status}`)
  }

  return res.json()
}

// SSE 串流呼叫 AI Skill，callback 每次收到 chunk 時觸發
export async function aiStream(
  agentId: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
): Promise<void> {
  const res = await apiFetch('/api/ai/stream', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`AI stream failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    // SSE format: "data: {...}\n\n"
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onDone()
          return
        }
        try {
          const { chunk } = JSON.parse(payload)
          if (chunk) onChunk(chunk)
        } catch {
          // ignore malformed lines
        }
      }
    }
  }

  onDone()
}
```

- [ ] **Step 2: 在 `packages/lib/src/index.ts` export 新 helpers**

找到現有的 export，加入：
```typescript
export { aiRun, aiStream } from './ai'
export type { AiRunResult } from './ai'
```

- [ ] **Step 3: 確認 TypeScript 編譯**

```bash
pnpm --filter @vitera/lib tsc --noEmit
# Expected: 沒有 error 輸出
```

- [ ] **Step 4: Commit**

```bash
git add packages/lib/src/ai.ts packages/lib/src/index.ts
git commit -m "feat: add aiRun and aiStream helpers to @vitera/lib"
```

---

## Task 5：Wounds app POC — 改用 aiStream

**Files:**
- 修改：`apps/wounds/src/app/scan/page.tsx`

目前 wounds scan 呼叫 `apiFetch('/api/analyze', ...)` 拿 AI 分析結果。這個 task 是 POC，驗證整條 ADK 串接是通的。只改 wounds，其他 app 之後再改。

> 注意：需要先在 Warehouse 設定好對應的 AI Skill（`wound-analysis`），並確保 ADK Service 有對應的 agent_id。

- [ ] **Step 1: 在 wounds scan page 引入 aiStream**

在 `apps/wounds/src/app/scan/page.tsx` 找到現有的 import：
```typescript
import { apiFetch } from '@vitera/lib'
```

加入：
```typescript
import { aiStream } from '@vitera/lib'
```

- [ ] **Step 2: 新增 streaming result state**

在現有 state 宣告處加入：
```typescript
const [streamingResult, setStreamingResult] = useState('')
const [isStreaming, setIsStreaming] = useState(false)
```

- [ ] **Step 3: 替換 AI 分析呼叫**

找到現有的：
```typescript
const response = await apiFetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: imagePreview.split(',')[1],
    prompt: `...`
  })
})
const data = await response.json()
```

替換為：
```typescript
setIsStreaming(true)
setStreamingResult('')

await aiStream(
  'wound-analysis',
  (chunk) => setStreamingResult(prev => prev + chunk),
  () => setIsStreaming(false)
)
```

- [ ] **Step 4: 更新 UI 顯示串流結果**

找到顯示分析結果的 JSX（通常是顯示 `data.analysis` 的地方），改為顯示 `streamingResult`：
```tsx
{/* 串流顯示中 */}
{isStreaming && (
  <div className="animate-pulse text-sm text-gray-500">分析中...</div>
)}
{streamingResult && (
  <div className="text-sm whitespace-pre-wrap">{streamingResult}</div>
)}
```

- [ ] **Step 5: 本地端對端測試**

1. 確保 ADK Service 在 local 跑起來（port 8080）
2. 確保 Warehouse 有 `wound-analysis` skill
3. 啟動 Vitera dev server：`pnpm dev`
4. 打開 wounds LIFF app，上傳一張傷口圖片
5. 確認 AI 分析結果以串流方式逐字出現

- [ ] **Step 6: Commit**

```bash
git add apps/wounds/src/app/scan/page.tsx
git commit -m "feat: wounds scan uses aiStream via ADK Service (POC)"
```

---

## Task 6：環境變數確認與 Cloud Run 部署準備

**Files:**
- 修改：`backend/.env.example`
- 確認：GCP Secret Manager 設定

- [ ] **Step 1: 確認所有 env var 都在 .env.example 裡**

`backend/.env.example` 應包含：
```
# 既有
DATABASE_URL=
GEMINI_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# 新增（Plan 1）
ADK_URL=https://adk-service-xxx-uc.a.run.app
ADK_API_KEY=
```

- [ ] **Step 2: 確認 GCP Secret Manager 有 ADK_API_KEY**

```bash
# 確認 secret 存在（需要 GCP 權限）
gcloud secrets describe ADK_API_KEY --project=<your-project>
# Expected: name: projects/.../secrets/ADK_API_KEY
```

- [ ] **Step 3: 確認 Cloud Run 的 Vitera BE service 有注入這個 secret**

在 GCP Console 或用 gcloud 確認 Cloud Run service 的環境變數設定有 `ADK_URL` 和 `ADK_API_KEY`。

- [ ] **Step 4: Final commit**

```bash
git add backend/.env.example
git commit -m "chore: document ADK env vars in .env.example"
```

---

## Self-Review 清單

完成所有 task 後，驗證以下項目：

- [ ] `pnpm --filter @vitera/backend tsc --noEmit` — 0 errors
- [ ] `pnpm --filter @vitera/lib tsc --noEmit` — 0 errors
- [ ] Wounds POC 可以成功顯示串流 AI 結果
- [ ] `/api/ai/run` 同步端點可以正常回傳（等 Plan 2 LINE Bot 使用）
- [ ] `.env.example` 有文件化所有新 env var
