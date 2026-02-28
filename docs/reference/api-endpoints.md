# API Endpoints Reference

這份參考文件列出了 Health & Care 平台所有後端 API 的路由與功能說明。所有 API 均實作於目錄 `src/app/api/` 下的 Route Handlers。

## 1. 認證 (`/api/auth/*`)

| Method | Path | 說明 | 需認證 |
|--------|------|------|:------:|
| POST | `/api/auth/register` | Email 註冊 (email, password, displayName) | ❌ |
| POST | `/api/auth/login` | Email 登入 (email, password) | ❌ |
| GET | `/api/auth/me` | 檢查當前 session | ❌ |
| POST | `/api/auth/me` | LINE 登入 (lineUserId, displayName, pictureUrl) | ❌ |
| DELETE | `/api/auth/me` | 登出 (清除 cookie) | ❌ |

## 2. 傷口照護模組 (`/api/wounds/*`)

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/wounds` | 取得當前用戶所有傷口 |
| POST | `/api/wounds` | 建立新傷口 |
| PATCH | `/api/wounds/[woundId]` | 更新傷口的名稱、部位、類型等資料 |
| DELETE| `/api/wounds/[woundId]` | 封存 (Archive) 傷口紀錄 |
| GET | `/api/wounds/[woundId]/logs` | 取得特定傷口的復原日誌列表 |
| POST | `/api/wounds/[woundId]/logs` | 建立新日誌 (包含每次拍照評估後的 AI 分析結果) |
| GET | `/api/wounds/[woundId]/soap` | 即時請求 Gemini AI 生成專業 SOAP 護理病歷 |

## 3. 保健品與打卡模組 (`/api/supplements/*`, `/api/checkins/*`)

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/supplements` | 取得用戶保健品清單 |
| POST | `/api/supplements` | 新增保健品 |
| PUT | `/api/supplements` | 更新保健品 |
| DELETE | `/api/supplements` | 刪除保健品 |
| GET | `/api/checkins` | 取得打卡記錄 (支援帶入 Parameter `?type=streak`) |
| POST | `/api/checkins` | 新增今日吃藥打卡 |
| DELETE | `/api/checkins` | 取消今日吃藥打卡 |

## 4. AI 與第三方服務

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/analyze` | Gemini AI 影像分析。接受參數 `image` (base64) 與 `mode` ('label' | 'checkin' | 'wound') |
| POST | `/api/notify` | 發送 LINE 主動推播訊息 (push message) |

## 5. 系統管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/admin` | 取得醫護管理後台資料 (讀取所有病患的傷口與 logs) |
| POST | `/api/setup` | 手動觸發 DB Schema 初始化 (開發環境用) |
