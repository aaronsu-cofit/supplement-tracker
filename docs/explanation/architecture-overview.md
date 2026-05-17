# Architecture Overview

**Vitera** 是一個專注於個人化照護的多模組健康管理平台。本文件的目的是解釋高層級的系統設計、模組切分邏輯，以及為什麼採用這樣的技術棧。

---

## 1. 模組化設計理念

專案採用 **Monorepo + Microservices Frontend** 架構，將不同的健康照護功能拆分為獨立的前端應用，但共用同一個後端 API 與認證系統。

### 目前的模組生態

Vitera 平台目前包含 **7+ 個獨立模組**，各自專注於不同的健康照護領域：

#### 核心健康模組
- 💊 **保健品追蹤 (`/supplements`)**：日常保健品管理、圖文辨識標籤、服藥提醒
- 🩹 **傷口照護 (`/wounds`)**：遠距傷口追蹤、AI 影像分析、SOAP 醫療紀錄生成
- 🦴 **骨骼關節 (`/bones`)**：拇趾外翻 AI 檢測、足部評估、WebRTC 智能相機
- 💗 **親密健康 (`/intimacy`)**：性健康評估、AI 個人化建議

#### 女性健康專區
- 🩸 **經期追蹤 (`/period-tracker`)**：月曆視圖、症狀記錄、PBAC 計分系統
- 🧘 **女性療癒室 (`/women-healing-room`)**：日記記錄、放鬆練習、心理健康評估

#### 管理與入口
- 🏠 **Portal (`/portal`)**：統一入口、模組導航、Email/LINE 雙重登入
- 🏢 **HQ 後台 (`/hq`)**：模組管理、管理員後台、LINE OA 配置、問卷系統

### 為什麼模組化？

將系統模組化有以下優勢：
1. **團隊分工**：不同的開發團隊可以獨立維護各自的模組
2. **獨立部署**：每個模組可以獨立部署到 GCP Cloud Run，互不影響
3. **彈性擴展**：新增模組不需要修改既有系統
4. **多 LINE OA 支援**：不同模組可以對應不同的 LINE Official Account，使用獨立的 LIFF ID

---

## 2. 全端架構 (Full-stack Architecture)

### 2.1 高層級架構圖

```text
┌─────────────────────────────────────────────────────────────────┐
│                   使用者界面 (Client)                              │
│  LINE App / Mobile Browser / Desktop Browser                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              前端層 (Frontend - GCP Cloud Run)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ portal   │  │ wounds   │  │ bones    │  │ hq       │ ...   │
│  │ :3000    │  │ :3001    │  │ :3003    │  │ :3005    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  Next.js 15 (App Router) + React 19                            │
│  @vitera/lib (AuthProvider, LiffProvider, ...)                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS (credentials: include)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              後端層 (Backend API - GCP Cloud Run)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Fastify 5 (取代 Hono.js)                                 │  │
│  │  MVC 架構：Controllers + Services                         │  │
│  │  24 個路由模組：/api/auth, /api/wounds, /api/periods...  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Auth (JWT)  │  │ AI (Gemini) │  │ LINE Bot    │           │
│  │ + bcryptjs  │  │ 6-model     │  │ SDK         │           │
│  │             │  │ fallback    │  │             │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              資料層 (Data & External Services)                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ GCP Cloud SQL    │  │ AI Skill         │                    │
│  │ PostgreSQL       │  │ Platform         │                    │
│  │ + Prisma ORM     │  │ (FastAPI)        │                    │
│  │ 50+ 資料表       │  │ 外部智能對話      │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 前後端分離策略

- **前端**：每個 `apps/*` 是獨立的 GCP Cloud Run 服務
  - Docker build context 為 monorepo 根目錄
  - 透過 `NEXT_PUBLIC_API_URL` 指向統一後端
  - 環境變數在 **build 時 bake 進 JS bundle**（重要！）

- **後端**：單一 Fastify API Server
  - 所有前端 apps 共用同一個 API endpoint
  - 提供 RESTful API、WebSocket、SSE streaming
  - 統一處理認證、資料庫、AI 呼叫

### 2.3 認證流程

Vitera 實作了**雙重登入系統**：

```text
使用者 → 是否在 LINE 環境？
         ├─ 是 → LIFF 自動登入 → 取得 LINE Profile → POST /api/auth/me
         └─ 否 → Email/Password 登入 → POST /api/auth/login

         ↓ 兩種方式都會取得

後端簽發 JWT → Set-Cookie: auth_token (httpOnly)

         ↓

所有 API 呼叫自動帶上 cookie (credentials: 'include')
```

詳細流程請參考 [認證流程說明](../reference/auth-flow.md)。

---

## 3. 核心組件設計決策 (Design Decisions)

### 3.1 為什麼從 Hono.js 遷移到 Fastify？

**V1-V2 使用 Hono.js**：
- 輕量、快速、TypeScript 優先
- 適合快速 MVP 開發

**V3+ 遷移到 Fastify**：
- ✅ **更成熟的生態系**：豐富的 plugin 生態、社群支援
- ✅ **MVC 架構支援**：更適合大型專案的 Controller-Service 分層
- ✅ **內建驗證**：JSON Schema 驗證、型別安全
- ✅ **效能優異**：與 Hono 相當的高效能，但功能更完整

**遷移時間軸**：
- 2025-11: 使用 Hono.js (MVP)
- 2026-05: 完成 Fastify 遷移 (MVC 架構)

### 3.2 為什麼使用 Prisma ORM？

從手動 SQL DDL 遷移到 Prisma 的原因：

1. **型別安全**：自動生成 TypeScript 型別
2. **Migration 管理**：版本化的資料庫 schema 變更
3. **開發效率**：直觀的 CRUD API，減少 SQL boilerplate
4. **資料關聯**：自動處理 JOIN、巢狀查詢

**範例**：
```typescript
// 以前（手動 SQL）
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// 現在（Prisma）
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { wounds: true, periods: true }
});
```

### 3.3 為什麼選擇 GCP Cloud Run 而非 Vercel？

**早期（V1）使用 Vercel**：
- 適合 Next.js 快速部署

**現在使用 GCP Cloud Run**：
- ✅ **多框架支援**：不限定 Next.js，可部署任何容器化應用
- ✅ **成本控制**：更靈活的計費模式，scale to zero
- ✅ **GCP 生態整合**：與 Cloud SQL、Secret Manager、Cloud Storage 無縫整合
- ✅ **企業級**：符合醫療產業的安全與合規需求

### 3.4 AI 模型的多層 Fallback 策略

為確保高可用性與成本最佳化，Vitera 採用**雙鏈 AI 架構**：

#### Chain A: AI Skill Platform (智能對話)
外部 FastAPI 服務，用於：
- LINE 聊天機器人智能回覆
- Rich Menu 自動切換
- 情境推播訊息

**呼叫流程**：
```typescript
// backend/src/lib/adk.ts
adkRun(agentId, userId, { message })
  → POST /vitera/run
  → Authorization: Bearer <token>
```

#### Chain B: Google Gemini (影像分析 & 結構化提取)
6 個 Gemini 模型依序 fallback：
1. `gemini-3.1-flash-lite-preview` (優先，極快極便宜)
2. `gemini-3-flash-preview`
3. `gemini-2.5-flash-lite`
4. `gemini-2.5-flash`
5. `gemini-flash-lite-latest`
6. `gemini-flash-latest` (最穩定，備援)

**用途**：
- 傷口影像分析
- 拇趾外翻檢測
- 保健品標籤辨識
- SOAP 醫療紀錄生成

詳細架構請參考 [LLM Architecture](../reference/llm-architecture.md)。

---

## 4. 前端共用架構

### 4.1 Shared Packages

| 套件 | 用途 | 框架依賴 |
|------|------|----------|
| `@vitera/lib` | 認證、LIFF、API 呼叫 | Next.js (useRouter, usePathname) |
| `@vitera/client-auth` | 框架無關的 LIFF 認證 | 無（適用於 Vite、CRA 等） |
| `@vitera/ui` | 共用 React 元件 | React |
| `@vitera/utils` | 純工具函數 | 無 |

### 4.2 Provider 洋蔥結構

大部分 Next.js apps 的 Layout 包裹順序：

```jsx
<LiffProvider>
  <AuthProvider>
    <LanguageProvider>
      <ModuleProvider>
        <AuthGuard>
          {children}
        </AuthGuard>
      </ModuleProvider>
    </LanguageProvider>
  </AuthProvider>
</LiffProvider>
```

這確保了：
1. LINE 授權先完成
2. 使用者登入狀態就緒
3. 語系設定載入
4. 模組配置可用
5. 最後才渲染頁面內容

---

## 5. 資料庫架構

### 5.1 核心資料表群組

Vitera 使用 Prisma 管理 **50+ 張資料表**，主要分為以下群組：

#### 使用者與認證
- `User`, `Admin` - 雙重使用者系統
- `Session` - 登入 session 管理

#### 健康模組資料
- **保健品**：`Supplement`, `Checkin`
- **傷口**：`Wound`, `WoundLog`, `WoundImage`
- **足部**：`FootAssessment`, `FootImage`
- **經期**：`MenstrualCycle`, `Period`, `DailyLog`
- **親密健康**：`IntimacyAssessment`
- **女性療癒**：`WomenHealingEntry`, `RelaxationSession`

#### 平台管理
- **LINE**：`LineOA`, `RichMenuTemplate`, `Scenario`
- **配置**：`Product`, `Module`, `ContentItem`
- **問卷**：`QuestionnaireTemplate`, `QuestionnaireResponse`

#### 遊戲化
- `BadgeTemplate`, `UserBadge`, `Streak`, `UserAttribute`
- `MissionTemplate`, `UserMission`, `JourneyTemplate`

完整 schema 請參考 [Database Schema](../reference/database-schema.md)。

---

## 6. 部署架構

### 6.1 環境劃分

| 環境 | 分支 | 部署目標 | 自動部署 |
|------|------|---------|---------|
| Development | `feature/*` | Local | 手動 |
| Staging | `staging` | GCP Cloud Run (staging) | CI/CD ✅ |
| Production | `main` | GCP Cloud Run (production) | 手動 merge |

### 6.2 前端部署流程

```bash
# 單一 app 部署
./scripts/deploy-frontend-cloudrun.sh wounds --env staging

# 全部 apps 部署
./scripts/deploy-frontend-cloudrun.sh all --env production
```

每個 app 編譯成獨立的 Docker image，部署到專屬的 Cloud Run service：
- `vitera-portal-staging`
- `vitera-wounds-staging`
- `vitera-bones-staging`
- ...

### 6.3 後端部署流程

```bash
./scripts/deploy-backend.sh
```

單一後端服務，所有前端共用：
- `vitera-backend-staging`
- `vitera-backend-production`

---

## 7. 安全性考量

### 7.1 認證與授權
- **JWT Token**：HS256 簽名，365 天有效期
- **Cookie**：httpOnly, secure, sameSite=lax
- **Password**：bcrypt hash (salt rounds = 10)

### 7.2 API 防護
- **Hard Auth**：必須有效 JWT，否則 401
- **Soft Auth**：無 JWT 時允許匿名 UUID fallback
- **Admin Auth**：額外檢查 `role = 'admin' | 'superadmin'`

### 7.3 CORS 設定
生產環境嚴格限制來源：
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
// 只允許白名單的前端網域存取
```

---

## 8. 監控與可觀測性

### 8.1 日誌系統
- **message_log**：所有 LINE 訊息的 audit trail
- **unmatched_intents**：未匹配的使用者問題，用於改善 AI
- **message_deliveries**：推播訊息的去重與追蹤

### 8.2 錯誤處理
- 統一 Error Handler (Fastify)
- 結構化錯誤回應：`{ error: string, details?: any }`
- Console logging + 未來可接 GCP Cloud Logging

---

## 9. 未來演進方向

### 9.1 技術債務
- [ ] 統一所有 apps 使用 TypeScript
- [ ] 增加 E2E 測試覆蓋率

### 9.2 新功能規劃
- [ ] V3 MedLM 整合（傷口專業分析）
- [ ] FHIR 格式匯出（對接醫院系統）
- [ ] 智能敷料推薦引擎

---

## 10. 延伸閱讀

- [API Endpoints 參考](../reference/api-endpoints.md) - 所有 API 端點
- [Database Schema](../reference/database-schema.md) - 完整資料庫結構
- [Auth Flow](../reference/auth-flow.md) - 雙重登入機制
- [LLM Architecture](../reference/llm-architecture.md) - AI 整合架構
- [Local Setup Tutorial](../tutorials/01-local-setup.md) - 新人上手教學
