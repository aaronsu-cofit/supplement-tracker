# Health & Care — 開發者技術文件

> **版本**：v1.0 ｜ **更新日期**：2026-02-27 ｜ **Commit**：`d981110`

---

## 目錄

1. [專案概覽](#1-專案概覽)
2. [技術架構](#2-技術架構)
3. [目錄結構](#3-目錄結構)
4. [環境變數](#4-環境變數)
5. [資料庫 Schema](#5-資料庫-schema)
6. [認證系統](#6-認證系統)
7. [API 路由清單](#7-api-路由清單)
8. [前端頁面與元件](#8-前端頁面與元件)
9. [LIFF / LINE 整合](#9-liff--line-整合)
10. [AI 影像分析](#10-ai-影像分析)
11. [本地開發指南](#11-本地開發指南)
12. [部署說明](#12-部署說明)
13. [已知限制與待改進](#13-已知限制與待改進)

---

## 1. 專案概覽

**Health & Care** 是一個多模組健康照護平台，目前包含 3 個服務模組：

| 模組 | 路徑 | 說明 | 狀態 |
|------|------|------|:----:|
| 💊 保健品追蹤 | `/supplements` | 保健品管理 + 每日打卡 + AI 辨識 | ✅ 上線 |
| 🩹 傷口照護 | `/wounds` | 傷口拍照 + AI 分析 + Timeline + 醫護後台 | ✅ 上線 |
| 🦴 骨骼關節 | `/bones` | 預留模組 | 🔲 未開發 |

根入口 `/` 是一個 Portal 頁面，導向各模組。

---

## 2. 技術架構

```
┌─────────────────────────────────────────────────┐
│                   前端 (Client)                  │
│  Next.js 16 + React 19 (App Router, CSR)        │
│  @line/liff (LINE Front-end Framework)          │
├─────────────────────────────────────────────────┤
│                   後端 (API)                     │
│  Next.js Route Handlers (src/app/api/*)         │
│  ├─ Auth: JWT (jose) + bcryptjs                 │
│  ├─ AI:  Google Gemini 2.5 Flash                │
│  └─ Notify: LINE Messaging API (Push)           │
├─────────────────────────────────────────────────┤
│                  資料庫 (DB)                     │
│  Neon Postgres (Serverless) + In-memory fallback│
├─────────────────────────────────────────────────┤
│                  部署 (Deploy)                   │
│  Vercel (auto-deploy from GitHub master)        │
│  Production: supplement-tracker-kappa.vercel.app│
└─────────────────────────────────────────────────┘
```

### 依賴套件

| 套件 | 版本 | 用途 |
|------|------|------|
| `next` | 16.1.6 | Full-stack React framework |
| `react` / `react-dom` | 19.2.3 | UI library |
| `@neondatabase/serverless` | ^1.0.2 | Neon Postgres driver |
| `@google/generative-ai` | ^0.24.1 | Gemini AI SDK |
| `@line/liff` | ^2.27.3 | LINE Front-end Framework |
| `@line/bot-sdk` | ^10.6.0 | LINE push message API |
| `jose` | ^6.1.3 | JWT sign/verify |
| `bcryptjs` | ^3.0.3 | 密碼 hash |

---

## 3. 目錄結構

```
src/app/
├── page.js                    # Portal 入口 (服務選單)
├── layout.js                  # Root layout (HTML head, metadata)
├── ClientLayout.js            # Client wrapper: LIFF → Auth → i18n → RouteGuard
├── globals.css                # 全域 CSS
├── login/
│   └── page.js                # 登入/註冊頁
├── (services)/
│   ├── supplements/           # 💊 保健品模組
│   │   ├── page.js            #   主頁 (列表 + 打卡)
│   │   ├── admin/page.js      #   管理後台
│   │   └── ...
│   ├── wounds/                # 🩹 傷口照護模組
│   │   ├── layout.js          #   共用 shell (header + bottom nav)
│   │   ├── page.js            #   儀表板 (首頁)
│   │   ├── scan/page.js       #   拍照 + 症狀輸入
│   │   ├── result/page.js     #   AI 分析結果
│   │   ├── history/page.js    #   復原歷程 timeline
│   │   └── admin/page.js      #   醫護後台 (病患清單 + SOAP)
│   └── bones/                 # 🦴 骨骼模組 (預留)
├── api/
│   ├── auth/
│   │   ├── register/route.js  # POST — Email 註冊
│   │   ├── login/route.js     # POST — Email 登入
│   │   └── me/route.js        # GET/POST/DELETE — Session/LINE/Logout
│   ├── analyze/route.js       # POST — Gemini AI 影像分析 (多模式)
│   ├── notify/route.js        # POST — LINE push message
│   ├── wounds/
│   │   ├── route.js           # GET/POST — 傷口 CRUD
│   │   └── [woundId]/
│   │       ├── route.js       # PATCH — 更新傷口名稱
│   │       ├── logs/route.js  # GET/POST — 傷口日誌
│   │       └── soap/route.js  # GET — 生成 SOAP 病歷
│   ├── supplements/           # GET/POST/PUT/DELETE 保健品
│   ├── checkins/              # GET/POST/DELETE 打卡
│   ├── admin/                 # GET 管理後台資料
│   └── setup/                 # POST 初始化 DB
├── components/
│   ├── auth/AuthProvider.js   # 認證 Context Provider
│   ├── liff/LiffProvider.js   # LIFF Context Provider
│   ├── AddSupplementModal.js  # 新增保健品彈窗
│   ├── CameraCapture.js       # 相機拍照元件
│   ├── LanguageSwitcher.js    # 中/英切換
│   └── Navbar.js              # 保健品模組頂部導覽
└── lib/
    ├── auth.js                # JWT/bcrypt/Cookie helpers
    ├── db.js                  # 資料庫層 (Postgres + memory fallback)
    ├── userId.js              # 用戶 ID 取得邏輯
    └── i18n/                  # 多國語系 (zh-TW, en)
```

---

## 4. 環境變數

### 必要 (Production)

| 變數名 | 說明 | 取得方式 |
|--------|------|---------|
| `DATABASE_URL` | Neon Postgres 連線字串 | Vercel Storage → Neon |
| `GEMINI_API_KEY` | Google AI Studio API Key | https://aistudio.google.com/ |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token | LINE Developer Console |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | LINE Developer Console |
| `NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS` | LIFF App ID (保健品) | LINE Developer Console |
| `JWT_SECRET` | JWT 簽名密鑰 | `openssl rand -base64 32` |

### 選配

| 變數名 | 說明 |
|--------|------|
| `NEXT_PUBLIC_LIFF_ID_WOUNDS` | LIFF App ID (傷口) — 未設定時 fallback 到 supplements |
| `NEXT_PUBLIC_LIFF_ID_BONES` | LIFF App ID (骨骼) — 未設定時 fallback |

### `.env.local` 範例

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
GEMINI_API_KEY=AIzaSy...
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_CHANNEL_SECRET=xxxxx
NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS=2009241308-RNRuOdIB
NEXT_PUBLIC_LIFF_ID_WOUNDS=
NEXT_PUBLIC_LIFF_ID_BONES=
JWT_SECRET=your-secure-random-secret
```

> ⚠️ 若 `DATABASE_URL` 未設定，`db.js` 會自動切換到 **in-memory mode**（適合本地開發，重啟後資料清空）。

---

## 5. 資料庫 Schema

使用 Neon Serverless Postgres，所有表在 `initializeDatabase()` 中以 `CREATE TABLE IF NOT EXISTS` 自動建立。

### 5.1 `supplements` — 保健品

```sql
CREATE TABLE supplements (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(200),
    name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    time_of_day VARCHAR(50),  -- 'morning' | 'afternoon' | 'evening'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 `check_ins` — 打卡記錄

```sql
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(200),
    supplement_id INTEGER REFERENCES supplements(id),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 `wounds` — 傷口

```sql
CREATE TABLE wounds (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(200),
    name VARCHAR(200),
    date_of_injury DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    display_name VARCHAR(200),   -- LINE 顯示名稱
    picture_url TEXT              -- LINE 頭像
);
```

### 5.4 `wound_logs` — 傷口日誌

```sql
CREATE TABLE wound_logs (
    id SERIAL PRIMARY KEY,
    wound_id INTEGER REFERENCES wounds(id),
    user_id VARCHAR(200),
    image_data TEXT,              -- base64 encoded JPEG
    nrs_pain_score INTEGER,      -- 0-10 NRS 疼痛量表
    symptoms TEXT,               -- 逗號分隔: '局部發熱,有異味'
    ai_assessment_summary TEXT,  -- AI 分析摘要
    ai_status_label VARCHAR(100),-- '復原進度符合預期' | '需多加留意觀察' | '建議諮詢專業醫護'
    logged_at TIMESTAMP DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE
);
```

### 5.5 `users` — 用戶

```sql
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,  -- UUID (Email) 或 LINE userId
    email VARCHAR(200) UNIQUE,
    password_hash VARCHAR(200),
    display_name VARCHAR(200),
    picture_url TEXT,
    auth_provider VARCHAR(20) NOT NULL,  -- 'email' | 'line'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 索引

```sql
CREATE INDEX idx_supplements_user ON supplements(user_id);
CREATE INDEX idx_checkins_user_date ON check_ins(user_id, date);
CREATE INDEX idx_wounds_user ON wounds(user_id);
CREATE INDEX idx_wound_logs_user_date ON wound_logs(user_id, date);
```

---

## 6. 認證系統

### 6.1 架構流程

```
                    ┌──────────────┐
                    │  /login 頁面  │
                    └──────┬───────┘
                 ┌─────────┼─────────┐
                 ▼                   ▼
        LINE 登入按鈕          Email 表單
        liff.login()          POST /api/auth/register
              │               POST /api/auth/login
              ▼                     │
     LINE OAuth 跳轉               ▼
              │               驗證 → hash → 建 user
              ▼                     │
     回到 App → LIFF getProfile     │
              │                     │
              ▼                     ▼
     POST /api/auth/me        signToken(userId)
     findOrCreateLineUser          │
              │                     │
              ▼                     ▼
         signToken(userId)   Set Cookie: auth_token (httpOnly)
              │
              ▼
     Set Cookie: auth_token (httpOnly)
```

### 6.2 關鍵檔案

| 檔案 | 說明 |
|------|------|
| `lib/auth.js` | JWT sign/verify、bcrypt hash/compare、cookie set/clear |
| `components/auth/AuthProvider.js` | React Context — 管理 user state、auto LINE login、session check |
| `ClientLayout.js` → `RouteGuard` | 需登入才能訪問的路由保護 |
| `lib/userId.js` | 取用戶 ID：優先 JWT → LINE cookie → supplement cookie → UUID |

### 6.3 Token 規格

- **演算法**：HS256
- **有效期**：365 天
- **Cookie 名**：`auth_token`
- **Cookie 屬性**：`httpOnly`, `secure` (production), `sameSite=lax`, `path=/`

### 6.4 用戶 ID 優先級

```javascript
// lib/userId.js
1. auth_token JWT 解析 → payload.userId  (最高優先)
2. line_user_id cookie                    (LIFF 設定)
3. supplement_user_id cookie              (legacy UUID)
4. 新生成 crypto.randomUUID()            (fallback)
```

---

## 7. API 路由清單

### 7.1 認證 (`/api/auth/*`)

| Method | Path | 說明 | 需認證 |
|--------|------|------|:------:|
| POST | `/api/auth/register` | Email 註冊 (email, password, displayName) | ❌ |
| POST | `/api/auth/login` | Email 登入 (email, password) | ❌ |
| GET | `/api/auth/me` | 檢查當前 session | ❌ |
| POST | `/api/auth/me` | LINE 登入 (lineUserId, displayName, pictureUrl) | ❌ |
| DELETE | `/api/auth/me` | 登出 (清除 cookie) | ❌ |

### 7.2 AI 分析 (`/api/analyze`)

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/analyze` | AI 影像分析 — 接受 image (base64) + mode |

**分析模式 (mode)**：

| mode | 用途 | Gemini Prompt |
|------|------|--------------|
| `label` | 辨識保健品標籤 | 解析成分、劑量、建議用法 |
| `checkin` | 識別手中保健品 | 比對已建檔清單，回傳打卡建議 |
| `wound` | 傷口狀態分析 | 以護理師口吻給出客觀描述 + 狀態標籤 |

### 7.3 傷口 (`/api/wounds/*`)

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/wounds` | 取得當前用戶所有傷口 |
| POST | `/api/wounds` | 建立新傷口 |
| PATCH | `/api/wounds/[woundId]` | 更新傷口名稱 |
| GET | `/api/wounds/[woundId]/logs` | 取得傷口日誌列表 |
| POST | `/api/wounds/[woundId]/logs` | 建立新日誌 (含 AI 結果) |
| GET | `/api/wounds/[woundId]/soap` | 生成 SOAP 病歷 (Gemini) |

### 7.4 保健品 (`/api/supplements/*`, `/api/checkins/*`)

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/supplements` | 取得用戶保健品清單 |
| POST | `/api/supplements` | 新增保健品 |
| PUT | `/api/supplements` | 更新保健品 |
| DELETE | `/api/supplements` | 刪除保健品 |
| GET | `/api/checkins` | 取得打卡記錄 (支援 `?type=streak`) |
| POST | `/api/checkins` | 新增打卡 |
| DELETE | `/api/checkins` | 取消打卡 |

### 7.5 其他

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/notify` | 發送 LINE push message |
| GET | `/api/admin` | 取得管理後台資料 (所有傷口 + logs) |
| POST | `/api/setup` | 手動觸發 DB 初始化 |

---

## 8. 前端頁面與元件

### 8.1 Context Provider 層級

```jsx
<LiffProvider>          // LINE LIFF SDK — 管理 liff, profile, isInitialized
  <AuthProvider>        // 認證 — 管理 user, isAuthenticated, login/register/logout
    <LanguageProvider>  // i18n — 管理語系切換
      <RouteGuard>      // 路由保護 — 未認證 → /login
        {children}
      </RouteGuard>
    </LanguageProvider>
  </AuthProvider>
</LiffProvider>
```

### 8.2 傷口照護頁面

| 頁面 | 路徑 | 主要功能 |
|------|------|---------|
| 儀表板 | `/wounds` | 歡迎 banner + 天數 badge + 快捷 action 卡片 + 照護建議 |
| 掃描頁 | `/wounds/scan` | 拍照上傳（自動壓縮 800px/70%）+ NRS 疼痛量表 + 症狀勾選 → AI 分析 |
| 結果頁 | `/wounds/result` | AI 狀態 banner + 詳細分析文字 + 護理師叮嚀 + 推薦操作 |
| 歷程頁 | `/wounds/history` | 垂直 timeline — 每筆含照片、AI 摘要、疼痛分數、症狀 |
| 醫護後台 | `/wounds/admin` | 病患列表 + 高風險標記 + 詳細 timeline + 一鍵 SOAP + 改名 |

### 8.3 設計語言（傷口照護）

- **主題**：深色 (Dark) — `#1a1225 → #16202e` 線性漸層
- **品牌色**：粉橘漸層 `#ff9a9e → #fda085`
- **卡片風格**：Glassmorphism — `rgba(255,255,255,0.04)` + `backdrop-filter: blur(20px)`
- **狀態色**：穩定 `#2ed573`、留意 `#ffa502`
- **字體**：系統字體 (Inter / SF Pro) — 無外部字體依賴
- **動畫**：CSS keyframes (spin, shimmer, floatEmoji)

---

## 9. LIFF / LINE 整合

### 9.1 LIFF 初始化流程

```
LiffProvider mount
  → 根據 pathname 選擇 LIFF ID
     /wounds → NEXT_PUBLIC_LIFF_ID_WOUNDS
     /supplements → NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS
     其他 → fallback: supplements || wounds || bones
  → liff.init({ liffId })
  → isLoggedIn? → getProfile() → 設 profile + line_user_id cookie
  → isInClient() && !isLoggedIn? → liff.login()
  → 否則 → guest mode (profile = null)
```

### 9.2 LINE Push 通知

**檔案**：`/api/notify/route.js`

使用 `@line/bot-sdk` 的 `Client.pushMessage()`，透過 `LINE_CHANNEL_ACCESS_TOKEN` 發送。

**觸發時機**：傷口掃描完成後，自動推播結果到用戶 LINE 聊天室。

### 9.3 LINE Developer Console 設定

- **LIFF Endpoint URL** 應設為部署根 URL（如 `https://supplement-tracker-kappa.vercel.app`）
- 若只設為 `/supplements`，其他路由（如 `/login`）呼叫 `liff.init()` 會出現 endpoint mismatch 警告

---

## 10. AI 影像分析

### 10.1 模型 Fallback

```javascript
const MODELS = [
    'gemini-2.5-flash-lite',    // 優先：成本最低
    'gemini-2.5-flash',          // 備援
    'gemini-flash-lite-latest',  // 備援
    'gemini-flash-latest',       // 最後備援
];
```

`callGemini()` 會依序嘗試每個模型 + v1beta/v1 API 版本，直到成功。

### 10.2 傷口分析 Prompt

AI 以 **專業護理師** 身份分析，回傳 JSON：

```json
{
  "analysis": "客觀描述文字...",
  "ai_status_label": "復原進度符合預期" | "需多加留意觀察" | "建議諮詢專業醫護"
}
```

### 10.3 圖片壓縮

前端在上傳前使用 Canvas API 壓縮：
- 最大寬度：**800px**
- JPEG 品質：**70%**
- 防止 Vercel 的 4.5MB body size limit

---

## 11. 本地開發指南

### 11.1 快速啟動

```bash
git clone https://github.com/weichun1008/supplement-tracker.git
cd supplement-tracker
npm install
# 複製環境變數檔 (至少需要 GEMINI_API_KEY 才能使用 AI)
cp .env.example .env.local
npm run dev
```

> 若不設 `DATABASE_URL`，`db.js` 自動使用 **in-memory mode**，不需 Postgres 也能跑。

### 11.2 無 LINE 環境開發

- 不設 LIFF ID → LIFF 不初始化 → 用 Email 帳號登入即可
- LINE 推播功能會靜默失敗 (catch + log)

### 11.3 資料庫操作

```bash
# 手動初始化資料庫 (通常自動觸發)
curl -X POST http://localhost:3000/api/setup

# 直接連 Neon 檢查
psql $DATABASE_URL
```

---

## 12. 部署說明

### 12.1 Vercel 設定

1. GitHub 連接 `weichun1008/supplement-tracker` → master branch auto-deploy
2. **Environment Variables** — 設定第 4 節所有必要變數
3. **Framework Preset**：Next.js (auto-detected)
4. **Build Command**：`npm run build`
5. **Output**：`.next/`

### 12.2 Neon Postgres

- 透過 Vercel Storage 自動綁定
- 連線字串在 Vercel 自動注入為 `DATABASE_URL`
- 無需手動建表 — `initializeDatabase()` 在每次 API call 自動執行

### 12.3 部署後驗證清單

- [ ] Email 註冊 / 登入正常
- [ ] LINE 登入正常（LIFF Endpoint URL 正確）
- [ ] 傷口拍照上傳 + AI 分析成功
- [ ] LINE push 通知收到
- [ ] Admin 後台可見病患
- [ ] SOAP 病歷生成正常

---

## 13. 已知限制與待改進

| # | 限制 | 影響 | 改進方向 |
|---|------|------|---------|
| 1 | 只追蹤 1 個傷口 (`wounds[0]`) | 多傷口病患無法分別追蹤 | V2: 多傷口管理 |
| 2 | 無傷口類型分類 | 無法針對不同傷口類型給建議 | V2: 建檔流程加類型/位置 |
| 3 | AI 每次獨立分析，無前後對比 | 無法看趨勢 | V2: 前後比較 + 趨勢圖 |
| 4 | 無換藥提醒 | 患者依從性低 | V2: Cron + LINE push |
| 5 | 圖片存 DB (base64) | 大量圖片後 DB 膨脹 | 改用 S3 / Vercel Blob |
| 6 | Admin 無權限管控 | 任何人可訪問 `/wounds/admin` | 加入角色權限 |
| 7 | 衛教內容硬編碼 | 無法動態更新 | CMS 或 AI 動態生成 |

> 📌 詳細 V2 產品規劃請參閱 [WoundCare PRD](./wound_care_prd.md)

---

## 附錄：Git Commit 歷程

```
d981110 fix: compress wound images before upload
8b9ceb2 fix: add initializeDatabase() to all auth routes
71685e2 fix: LINE login 400 — LIFF ID fallback + remove redirectUri
c1e9300 feat: dual auth system (LINE + Email) + wound care UI redesign
7d7d2b6 feat(liff): LINE profile binding, post-scan notification
dbecf06 feat(admin): editable names, vertical timeline, PATCH API
43ea0b3 fix(admin): distinguishable patient names
1f36aca feat(wounds): Hide navbar in admin, demo patient profile
069a2c2 feat(wounds): Patient history timeline + admin SOAP generator
```
