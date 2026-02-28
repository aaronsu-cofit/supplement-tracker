# Local Setup Tutorial

這篇教學會指引您如何在本地端將 **Health & Care** 專案跑起來。

## 1. 快速啟動

你需要 Node.js (建議 v20+) 與 npm。

```bash
git clone https://github.com/weichun1008/supplement-tracker.git
cd supplement-tracker
npm install
# 複製環境變數檔 (至少需要 GEMINI_API_KEY 才能使用 AI)
cp .env.example .env.local
npm run dev
```

> **提示**：若不設 `DATABASE_URL`，`lib/db.js` 會自動使用 **in-memory mode**（重啟後資料清空），不需連線 Postgres 也能跑本地端測試。

## 2. 環境變數設定

### 必填變數 (若要在本機完整測試)

| 變數名 | 說明 | 取得方式 |
|--------|------|---------|
| `DATABASE_URL` | Neon Postgres 連線字串 | Vercel Storage 或 Neon Console |
| `GEMINI_API_KEY` | Google AI Studio API Key | https://aistudio.google.com/ |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token | LINE Developer Console |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | LINE Developer Console |
| `NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS` | LIFF App ID (保健品) | LINE Developer Console |
| `JWT_SECRET` | JWT 簽名密鑰 | `openssl rand -base64 32` |

### 無 LINE 環境開發

如果你沒有 LINE Developer 帳號，也想在本地端測試：
- **不要設定** LIFF ID (`NEXT_PUBLIC_LIFF_ID_*`) 變數。
- 前端 LIFF 就不會初始化，你可以直接在網頁上用 Email 帳號密碼的形式註冊與登入。
- LINE 推播功能會靜默失敗 (catch + log)，不影響主要操作。

## 3. 資料庫操作

預設情況下，只要有資料庫連線，每次啟動應用程式並發出第一次 API 請求時，系統都會自動呼叫 `initializeDatabase()` 來建表。

如果需要手動觸發初始化：
```bash
curl -X POST http://localhost:3000/api/setup
```

直接連線到 Neon 檢查資料（需要安裝 `psql`）：
```bash
psql $DATABASE_URL
```

## 4. 了解目錄結構

剛把專案跑起來後，你可以先看這幾個最重要的資料夾了解架構：

```text
src/app/
├── (services)/
│   ├── supplements/           # 💊 保健品模組主畫面
│   ├── wounds/                # 🩹 傷口照護模組主畫面
│   └── bones/                 # 🦴 骨骼模組 (預留)
├── api/                       # 所有後端 API (Auth, Wounds, AI)
├── components/                # 共用 React 元件 (Auth, LIFF, UI)
└── lib/                       # 共用函式庫 (db, auth, i18n)
```
