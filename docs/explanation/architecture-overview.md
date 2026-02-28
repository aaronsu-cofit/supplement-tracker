# Architecture Overview

**Health & Care** 是一個專注於個人化照護的多模組健康管理平台。本文件的目的是解釋高層級的系統設計、模組切分邏輯，以及為什麼採用這樣的技術棧。

## 1. 模組化設計理念

專案分為三個主要模組，各自獨立發展但共用底層 API 與 Auth：
- 💊 **保健品追蹤 (`/supplements`)**：著重日常管理、用圖文辨識保健品標籤並提醒。
- 🩹 **傷口照護 (`/wounds`)**：著重歷程追蹤、遠距醫療。透過影像 AI 來判斷傷口癒合階段並生成 SOAP 醫療紀錄。
- 🦴 **骨骼關節 (`/bones`)**：未來的擴充防線。

將系統模組化有助於不同的開發團隊 (或業務邏輯) 分開維護，且可以根據不同的 LINE Official Account 分配不同的 LIFF ID 作為入口。

## 2. 全端架構 (Full-stack architecture)

```text
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
└─────────────────────────────────────────────────┘
```

## 3. 核心組件設計決策 (Design Decisions)

### 3.1 為什麼選擇 Next.js Route Handlers?
為求專案單一庫 (Monorepo) 管理方便，使用 Next.js 的 `/api` 路由，免除額外架設 Node.js Express 伺服器的成本。也完美契合 Vercel 提供的 Serverless Function 架構，具備自動水平擴展與無伺服器維護的特點。

### 3.2 為什麼使用 Neon Serverless Postgres?
傳統 RDBMS 在 Serverless 環境中常因「連線池 (Connection Pool) 用盡」而崩潰。Neon 原生支援 Serverless 環境，起管快且提供自動休眠、隨開即用 (Scale to zero) 的能耐，符合我們初期省成本、後期易維護的開發考量。

### 3.3 AI 模型回退機制 (Fallback Strategy)
在 `/app/api/analyze/route.js` 中，我們依賴 Google Gemini 作為核心 AI 引擎。為確保高可用性與成本最佳化，設計了 Fallback 陣列：
1. `gemini-2.5-flash-lite` (優先，成本極低，反應極快)
2. `gemini-2.5-flash` (備援，準確度略高)
3. `gemini-flash-lite-latest` (舊版穩定備援)

當發送請求因 Rate Limit 或伺服器異常失敗時，會自動 retry 陣列中的下一個模型。

## 4. 前端共用 Shell 結構
多半頁面皆包裹在 `ClientLayout.js` 之下，形成了以下這層洋蔥式的 Provider 結構：
`LiffProvider` $\rightarrow$ `AuthProvider` $\rightarrow$ `LanguageProvider` $\rightarrow$ `RouteGuard` $\rightarrow$ `{Page Content}`

這確保了：在真正渲染商務邏輯頁面之前，LINE 授權、使用者登入狀態、語系、以及權限擋板都已經準備完畢。
