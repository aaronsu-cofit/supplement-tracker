# Authentication & LIFF Integration

本專案實作了一套靈活的雙重登入系統，允許使用者透過 LINE 自動判定登入 (LIFF)，或者在沒有 LINE 環境下使用傳統 Email / Password。

## 1. 認證系統流程與優先級

系統的目標是：**如果有 LINE 環境就自動無縫登入，如果沒有就退回到 Email 登入。**

```
                    ┌──────────────┐
                    │  /login 頁面  │
                    └──────┬───────┘
                 ┌─────────┼─────────┐
                 ▼                   ▼
        LINE 自動/手動登入         Email 表單
        liff.login()          POST /api/auth/register
              │               POST /api/auth/login
              ▼                     │
     LINE OAuth 跳轉               ▼
              │               驗證 → hash → 查詢/建檔
              ▼                     │
     回到 App → LIFF getProfile     │
              │                     │
              ▼                     ▼
     POST /api/auth/me        簽發 JWT Token: signToken(userId)
     findOrCreateLineUser          │
              │                     │
              ▼                     ▼
         signToken(userId)   Set Cookie: auth_token (httpOnly)
              │
              ▼
     Set Cookie: auth_token (httpOnly)
```

### 用戶 ID 取用優先級 (lib/userId.js)
所有 API 都依賴 `lib/userId.js` 來判定目前是哪個使用者的對話：
1. **auth_token JWT 解析** → 取出 payload 中的 userId (最高優先級，最安全)
2. **line_user_id** cookie (LIFF 環境下設定，用於無縫連結舊版邏輯)
3. **supplement_user_id** cookie (Legacy UUID，最舊版的無登入模式)
4. 新生成 uuid (完全無憑證狀態下的 Fallback)

## 2. LINE Front-end Framework (LIFF) 初始化流程

負責的元件：`components/liff/LiffProvider.js`

1. Provider Mount 後，根據當下 `pathname` 決定使用哪個模組的 LIFF ID (`NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS` 或 `NEXT_PUBLIC_LIFF_ID_WOUNDS`)。
2. 呼叫 `liff.init({ liffId })` 進行初始化。
3. 若 `isLoggedIn` 回傳 true $\rightarrow$ 呼叫 `getProfile()` 取回頭像與姓名 $\rightarrow$ 設 Profile State 與 `line_user_id` cookie。
4. 若在 LINE 客戶端內 (`isInClient()`) 但尚未登入 $\rightarrow$ 自動呼叫 `liff.login()` 套用無縫登入。

## 3. JWT Token 規格
- **演算法**：HS256
- **密鑰**：環境變數 `JWT_SECRET`
- **有效期**：365 天
- **存放位置**：瀏覽器 Cookie (`auth_token`)
- **Cookie 屬性保護**：`httpOnly` (防 XSS)、`secure` (Production 防竊聽)、`sameSite=lax`、`path=/`。

## 4. LINE 主動推播通知 (Push Message)

實作於 `/api/notify/route.js`。
當傷口照護模組完成「拍照掃描 + AI 辨識」後，後端會主動使用 `@line/bot-sdk` 發送一則包含分析結果與提醒的訊息回患者的 LINE 聊天室中，以維繫患者留存率。
使用此功能必須設定 `LINE_CHANNEL_ACCESS_TOKEN` 與 `LINE_CHANNEL_SECRET`。
