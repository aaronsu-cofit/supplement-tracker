# API Endpoints Reference

Vitera 平台的所有後端 API 均使用 **Fastify** 框架實作，位於 `backend/src/routes/` 目錄下。

- **框架**：Fastify (TypeScript)
- **入口檔**：`backend/src/index.ts`
- **架構**：MVC (Controller-Service 分層)
- **認證**：JWT (Cookie-based) + LINE LIFF

---

## 🔐 認證與授權

### `/api/auth` — 使用者認證

| Method | Path | 說明 | 認證 |
|--------|------|------|:----:|
| POST | `/api/auth/register` | Email 註冊 (email, password, displayName) | ❌ |
| POST | `/api/auth/login` | Email 登入 (email, password) | ❌ |
| GET | `/api/auth/me` | 取得當前 session 資訊 | ❌ |
| POST | `/api/auth/line` | LINE LIFF 登入 (lineUserId, displayName, pictureUrl) | ❌ |
| POST | `/api/auth/logout` | 登出（清除 cookie） | ❌ |
| POST | `/api/auth/admin/login` | 管理員登入 | ❌ |

**認證方式**：
- Email 登入後回傳 `Set-Cookie: auth_token` (httpOnly, secure)
- LINE 登入透過 LIFF SDK 取得 profile，呼叫 `/api/auth/line` 完成靜默登入
- 所有受保護的 API 透過 `authMiddleware` 讀取 cookie 驗證 JWT

---

## 💊 保健品追蹤模組

### `/api/supplements` — 保健品管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/supplements` | 取得用戶所有保健品 |
| POST | `/api/supplements` | 新增保健品 |
| PUT | `/api/supplements/:id` | 更新保健品資訊 |
| DELETE | `/api/supplements/:id` | 刪除保健品 |

**需認證**：✅ (使用 `softAuthMiddleware`，支援匿名模式)

### `/api/checkins` — 服藥打卡

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/checkins` | 取得打卡記錄，支援 `?type=streak` 參數 |
| POST | `/api/checkins` | 新增今日吃藥打卡 |
| DELETE | `/api/checkins` | 取消今日吃藥打卡 |

**需認證**：✅

---

## 🩹 傷口照護模組

### `/api/wounds` — 傷口管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/wounds` | 取得用戶所有活躍傷口 |
| GET | `/api/wounds/admin` | 管理員取得所有傷口（後台用） |
| GET | `/api/wounds/:woundId` | 取得單個傷口詳情 |
| POST | `/api/wounds` | 建立新傷口紀錄 |
| PATCH | `/api/wounds/:woundId` | 更新傷口資訊（名稱、類型、部位等） |
| DELETE | `/api/wounds/:woundId` | 歸檔（軟刪除）傷口 |
| GET | `/api/wounds/:woundId/logs` | 取得傷口的所有復原日誌 |
| POST | `/api/wounds/:woundId/logs` | 建立日誌（含 AI 分析結果） |
| POST | `/api/wounds/:woundId/soap` | 生成 SOAP Note（護理病歷） |

**需認證**：✅

---

## 🦴 足部照護模組

### `/api/footcare` — 足部評估與影像分析

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/footcare/assessments` | 取得足部評估記錄 |
| POST | `/api/footcare/assessments` | 建立足部評估（痛點、NRS、步數等） |
| GET | `/api/footcare/images` | 取得足部影像分析歷史 |
| POST | `/api/footcare/images` | 上傳足部影像進行 AI 分析 |
| GET | `/api/footcare/shoes` | 取得鞋子磨損分析歷史 |
| POST | `/api/footcare/shoes` | 上傳鞋子影像進行磨損分析 |

**需認證**：✅

---

## 💗 親密健康模組

### `/api/intimacy` — 親密健康評估

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/intimacy/assessments` | 取得評估記錄 |
| POST | `/api/intimacy/assessments` | 建立新評估（含 AI 分析） |

**需認證**：✅

---

## 🩸 經期追蹤模組

### `/api/periods` — 經期記錄

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/periods` | 取得使用者的經期記錄列表 |
| POST | `/api/periods` | 建立新的經期記錄 |
| PUT | `/api/periods/:id` | 更新經期記錄（結束日期、備註等） |
| DELETE | `/api/periods/:id` | 刪除經期記錄 |

**需認證**：✅

### `/api/cycle` — 經期週期設定

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/cycle` | 取得使用者的週期設定 |
| POST | `/api/cycle` | 建立/更新週期設定（cycle_length, period_length） |
| POST | `/api/cycle/onboarding` | 完成 onboarding |

**需認證**：✅

### `/api/daily-logs` — 每日記錄

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/daily-logs` | 取得每日記錄（支援日期範圍查詢） |
| POST | `/api/daily-logs` | 建立/更新每日記錄（症狀、情緒、血量等） |

**需認證**：✅

---

## 🧘 女性療癒室模組

### `/api/women-healing` — 女性療癒室

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/women-healing/diary` | 取得日記記錄 |
| POST | `/api/women-healing/diary` | 建立日記記錄（含 AI 回饋） |
| GET | `/api/women-healing/relief-sessions` | 取得放鬆練習紀錄 |
| POST | `/api/women-healing/relief-sessions` | 記錄放鬆練習完成 |
| GET | `/api/women-healing/assessments` | 取得評估結果 |
| POST | `/api/women-healing/assessments` | 建立評估結果 |

**需認證**：✅

---

## 🤖 AI 與分析服務

### `/api/ai` — AI 服務整合

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/ai/run` | 執行 AI Skill Platform 的 agent（同步） |
| POST | `/api/ai/stream` | 執行 AI Skill Platform 的 agent（串流） |

**需認證**：✅

**用途**：
- 從 LIFF 前端直接呼叫 AI Skill Platform
- 支援多 agent、情境記憶、Ops 可調整 prompt

### `/api/analyze` — Gemini AI 影像分析

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/analyze` | Gemini 多模態影像分析 |

**需認證**：✅

**參數**：
- `image`: base64 encoded image
- `mode`: 分析模式
  - `'label'` — 食物標籤辨識
  - `'checkin'` — 保健品辨識
  - `'wound'` — 傷口評估
  - `'foot'` — 足部外翻評估
  - `'shoe'` — 鞋子磨損分析

---

## 📱 LINE OA 與平台管理

### `/api/lineoa` — LINE OA 管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/lineoa` | 取得所有 LINE OA 列表 |
| POST | `/api/lineoa` | 建立新 LINE OA |
| PUT | `/api/lineoa/:id` | 更新 LINE OA 設定 |
| DELETE | `/api/lineoa/:id` | 刪除 LINE OA |
| POST | `/api/lineoa/:id/test-ai-platform` | 測試 AI Platform 連線 |

**需認證**：✅ (Admin)

### `/api/webhook` — LINE Webhook

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/webhook/:oaId` | LINE Bot Webhook 接收端點 |

**需認證**：❌ (LINE Platform 簽章驗證)

**功能**：
- 接收 LINE 使用者訊息
- 執行 Intent Rule 匹配
- 未匹配則呼叫 AI Skill Platform fallback
- 紀錄至 `unmatched_intents` 表

### `/api/notify` — LINE 主動推播

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/notify` | 發送 LINE Push Message |

**需認證**：✅

**用途**：
- 傷口照護完成後主動推播分析結果
- 需設定 `LINE_CHANNEL_ACCESS_TOKEN`

---

## 🏢 後台管理 (HQ)

### `/api/hq` — HQ 管理介面

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/hq/line-oa` | 取得所有 LINE OA |
| POST | `/api/hq/line-oa` | 建立 LINE OA |
| PUT | `/api/hq/line-oa/:id` | 更新 LINE OA |
| DELETE | `/api/hq/line-oa/:id` | 刪除 LINE OA |
| GET | `/api/hq/products` | 取得所有產品配置 |
| POST | `/api/hq/products` | 建立產品配置 |
| PUT | `/api/hq/products/:id` | 更新產品配置 |
| DELETE | `/api/hq/products/:id` | 刪除產品配置 |
| GET | `/api/hq/modules` | 取得所有模組 |
| PUT | `/api/hq/modules/:id` | 更新模組設定 |
| GET | `/api/hq/content-items` | 取得內容項目 |
| POST | `/api/hq/content-items` | 建立內容項目 |
| PUT | `/api/hq/content-items/:id` | 更新內容項目 |
| DELETE | `/api/hq/content-items/:id` | 刪除內容項目 |
| GET | `/api/hq/intent-rules` | 取得意圖規則 |
| POST | `/api/hq/intent-rules` | 建立意圖規則 |
| PUT | `/api/hq/intent-rules/:id` | 更新意圖規則 |
| DELETE | `/api/hq/intent-rules/:id` | 刪除意圖規則 |
| GET | `/api/hq/missions` | 取得任務模板 |
| POST | `/api/hq/missions` | 建立任務模板 |
| PUT | `/api/hq/missions/:id` | 更新任務模板 |
| DELETE | `/api/hq/missions/:id` | 刪除任務模板 |
| GET | `/api/hq/badges` | 取得徽章模板 |
| POST | `/api/hq/badges` | 建立徽章模板 |
| PUT | `/api/hq/badges/:id` | 更新徽章模板 |
| DELETE | `/api/hq/badges/:id` | 刪除徽章模板 |
| GET | `/api/hq/journeys` | 取得旅程模板 |
| POST | `/api/hq/journeys` | 建立旅程模板 |
| PUT | `/api/hq/journeys/:id` | 更新旅程模板 |
| DELETE | `/api/hq/journeys/:id` | 刪除旅程模板 |

**需認證**：✅ (Admin Role)

---

## 📝 內容與配置

### `/api/products` — 產品配置管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/products` | 取得所有產品 |
| POST | `/api/products` | 建立產品 |
| PUT | `/api/products/:id` | 更新產品 |
| DELETE | `/api/products/:id` | 刪除產品 |

**需認證**：✅ (Admin)

### `/api/modules` — 模組管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/modules` | 取得所有啟用中的模組 |
| GET | `/api/modules/:id` | 取得單一模組 |

**需認證**：❌ (Public)

---

## 📋 問卷系統

### `/api/questionnaires` — 問卷管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/questionnaires/:key/spec` | 取得問卷規格（題目、選項、分數規則） |
| POST | `/api/questionnaires/:key/responses` | 提交問卷回覆 |
| GET | `/api/questionnaires/:key/responses` | 取得使用者的問卷回覆歷史 |

**需認證**：✅

**用途**：
- LIFF 問卷頁面 (`apps/questionnaires/q/[key]`) 透過此 API 讀取規格與提交
- 提交後會執行 `on_submit_actions`（設定屬性、分配任務等）

---

## 🎯 遊戲化與任務系統

### `/api/me` — 使用者個人資料與任務

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/me/profile` | 取得使用者 profile |
| GET | `/api/me/attributes` | 取得使用者屬性 |
| POST | `/api/me/attributes` | 設定使用者屬性 |
| GET | `/api/me/missions` | 取得使用者的任務列表 |
| POST | `/api/me/missions/:id/increment` | 增加任務進度 |
| POST | `/api/me/missions/:id/complete` | 完成任務 |
| GET | `/api/me/missions/:templateId/daily-logs` | 取得每日習慣打卡記錄 |
| POST | `/api/me/missions/:templateId/daily-logs` | 打卡 / 更新每日習慣 |
| GET | `/api/me/streaks` | 取得連續打卡記錄 |
| GET | `/api/me/badges` | 取得已獲得徽章 |
| GET | `/api/me/journey` | 取得當前旅程階段 |

**需認證**：✅

---

## 🎨 Rich Menu 管理

### `/api/richmenu` — Rich Menu 模板

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/richmenu/:oaId` | 取得 OA 的所有 Rich Menu 模板 |
| POST | `/api/richmenu/:oaId` | 建立 Rich Menu 模板 |
| PUT | `/api/richmenu/:oaId/:templateId` | 更新 Rich Menu 模板 |
| DELETE | `/api/richmenu/:oaId/:templateId` | 刪除 Rich Menu 模板 |
| POST | `/api/richmenu/:oaId/:templateId/upload` | 上傳 Rich Menu 圖片到 LINE Platform |
| POST | `/api/richmenu/:oaId/:templateId/set-default` | 設為預設 Rich Menu |

**需認證**：✅ (Admin)

### `/api/menu` — Rich Menu 自動切換

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/menu/auto-switch` | 根據使用者屬性自動切換 Rich Menu |

**需認證**：✅

**用途**：
- 由 `lib/menuEvaluator.ts` 使用 `rich-menu-selector` agent 決定
- 根據使用者生命階段、primary_concern 等屬性動態切換

---

## 🗓️ 排程與推播

### `/api/scheduler` — 排程推播管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/scheduler/scenarios` | 取得所有排程情境 |
| POST | `/api/scheduler/scenarios` | 建立排程情境 |
| PUT | `/api/scheduler/scenarios/:id` | 更新排程情境 |
| DELETE | `/api/scheduler/scenarios/:id` | 刪除排程情境 |
| POST | `/api/scheduler/trigger` | 手動觸發排程執行（測試用） |

**需認證**：✅ (Admin)

**用途**：
- 定期執行 CoBlocks 情境流程（如每日健康提醒、階段性衛教）
- 由 Cloud Scheduler 定時呼叫

---

## 🧙 引導流程 (Wizard)

### `/api/wizard` — 引導精靈

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/wizard/:flow/start` | 啟動引導流程 |
| POST | `/api/wizard/:flow/next` | 進入下一步 |
| GET | `/api/wizard/:flow/status` | 取得當前進度 |

**需認證**：✅

**用途**：
- 新使用者 onboarding
- 傷口建檔精靈
- 經期追蹤初始設定

---

## 📊 健康檢查與系統狀態

### 系統端點

| Method | Path | 說明 |
|--------|------|------|
| GET | `/health` | 健康檢查 (返回 `{ status: 'ok' }`) |
| GET | `/` | API 根路徑 (返回 API 版本資訊) |

**需認證**：❌

---

## 🔑 認證機制說明

### 1. Cookie-Based JWT

所有需要認證的端點透過以下方式驗證：

```typescript
// 1. 登入後設定 Cookie
Set-Cookie: auth_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/

// 2. 前端自動帶上 Cookie (credentials: 'include')
fetch('/api/supplements', { credentials: 'include' })

// 3. 後端 middleware 讀取 cookie 驗證
const token = request.cookies.auth_token
const decoded = verifyJWT(token)
```

### 2. Soft Auth vs Hard Auth

- **Soft Auth** (`softAuthMiddleware`): 允許匿名模式，若無 token 則產生 UUID fallback（用於 supplements、wounds 等健康模組）
- **Hard Auth** (`authMiddleware`): 必須有有效 token，否則回傳 401（用於 HQ、admin 端點）

### 3. Admin Role 檢查

HQ 相關端點會額外檢查：

```typescript
if (user.role !== 'admin' && user.role !== 'superadmin') {
  return reply.status(403).send({ error: 'Forbidden' })
}
```

---

## 🌐 CORS 設定

允許的來源（開發環境）：

```
http://localhost:3000  (portal)
http://localhost:3001  (wounds)
http://localhost:3002  (supplements)
http://localhost:3003  (bones)
http://localhost:3004  (intimacy)
http://localhost:3005  (hq)
http://localhost:3006  (period-tracker)
```

生產環境透過 `ALLOWED_ORIGINS` 環境變數設定白名單。

---

## 📦 Request/Response 格式

### 成功回應

```json
{
  "success": true,
  "data": { ... }
}
```

### 錯誤回應

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### 分頁回應

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔧 開發測試

### 本地測試

```bash
# 啟動 backend
pnpm --filter backend dev

# 健康檢查
curl http://localhost:8080/health

# 測試登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Postman / Thunder Client

建議使用 API 測試工具，並設定：
- Base URL: `http://localhost:8080`
- Headers: `Content-Type: application/json`
- Cookie 自動管理（登入後會自動帶上 `auth_token`）

---

## 📚 相關文件

- [Database Schema](./database-schema.md) — 完整資料庫 schema
- [Authentication Flow](./auth-flow.md) — 認證流程說明
- [LLM Architecture](./llm-architecture.md) — AI 服務架構
- [Module Versions](./module-versions.md) — 各模組版本歷程
