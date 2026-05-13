# @vitera/client-auth

客戶端認證工具包，包含 LINE LIFF 認證和 React hooks。

## 功能

- **LINE LIFF 認證** - 提供 `useLiff` React Hook 來簡化 LINE LIFF 整合
- **可擴展** - 未來可以加入其他認證方式（OAuth, 第三方 SDK 等）

## 安裝

此 package 是 monorepo 內部 package，無需額外安裝。

## 使用方式

### useLiff Hook

#### 自動登入模式（推薦）

預設啟用 `autoLogin`，初始化完成後會自動跳轉到 LINE 登入頁面：

```tsx
import { useLiff } from '@vitera/client-auth'
import { apiClient } from './api/client'

function App() {
  const searchParams = new URLSearchParams(window.location.search)

  const { isInitialized, error } = useLiff({
    // 優先使用 URL 參數，否則使用環境變數
    liffId: searchParams.get('liffId') || import.meta.env.VITE_LIFF_ID,

    // 自動登入（預設: true）
    autoLogin: true,

    // 當 LINE 登入成功時，將 LINE access token 換成系統 JWT
    onLoggedIn: async (lineAccessToken) => {
      await apiClient.loginWithLine(lineAccessToken)
      // 可以在這裡更新應用的認證狀態
    },

    // 錯誤處理
    onInitError: (error) => {
      console.error('LIFF init failed:', error)
    },
  })

  if (!isInitialized && !error) {
    return <div>正在初始化 LINE 登入...</div>
  }

  if (error) {
    return <div>錯誤: {error}</div>
  }

  // autoLogin 啟用時，會自動跳轉到 LINE 登入
  return <div>正在跳轉到 LINE 登入...</div>
}
```

#### 手動登入模式

如果需要顯示登入按鈕，可以將 `autoLogin` 設為 `false`：

```tsx
import { useLiff } from '@vitera/client-auth'
import { apiClient } from './api/client'

function App() {
  const searchParams = new URLSearchParams(window.location.search)

  const { isInitialized, isLoggedIn, error, login, logout } = useLiff({
    liffId: searchParams.get('liffId') || import.meta.env.VITE_LIFF_ID,
    autoLogin: false, // 停用自動登入
    onLoggedIn: async (lineAccessToken) => {
      await apiClient.loginWithLine(lineAccessToken)
    },
  })

  if (!isInitialized && !error) {
    return <div>正在初始化 LINE 登入...</div>
  }

  if (error) {
    return <div>錯誤: {error}</div>
  }

  if (!isLoggedIn) {
    return <button onClick={login}>使用 LINE 登入</button>
  }

  return (
    <div>
      <p>已登入 LINE</p>
      <button onClick={logout}>登出</button>
    </div>
  )
}
```

### API

#### `useLiff(options: UseLiffOptions): UseLiffReturn`

**參數 (UseLiffOptions)**:

- `liffId: string | null | undefined` - LIFF ID（必填）
- `autoInit?: boolean` - 是否自動初始化（預設: true）
- `autoLogin?: boolean` - 是否在初始化後自動登入（預設: true）。設為 true 時，初始化完成後若未登入會自動跳轉到 LINE 登入頁面
- `onInitSuccess?: (liff) => void` - 初始化成功回調
- `onInitError?: (error) => void` - 初始化失敗回調
- `onLoggedIn?: (accessToken: string) => void` - 登入成功回調，會傳入 LINE access token

**返回值 (UseLiffReturn)**:

- `liff: Liff | null` - LIFF SDK 實例
- `isInitialized: boolean` - 是否已初始化
- `isInitializing: boolean` - 是否正在初始化
- `error: string | null` - 錯誤訊息
- `isLoggedIn: boolean` - 是否已登入 LINE
- `accessToken: string | null` - LINE access token
- `profile: LiffProfile | null` - LINE 使用者資料（包含 userId, displayName, pictureUrl, statusMessage）
- `init: () => Promise<void>` - 手動初始化
- `login: () => void` - 執行登入
- `logout: () => void` - 執行登出

## 範例

### 顯示 LINE 使用者資訊

```tsx
import { useLiff } from '@vitera/client-auth'

function App() {
  const { isInitialized, isLoggedIn, profile, accessToken } = useLiff({
    liffId: import.meta.env.VITE_LIFF_ID,
    autoLogin: true,
    onLoggedIn: async (lineAccessToken) => {
      await apiClient.loginWithLine(lineAccessToken)
    },
  })

  if (!isInitialized) return <div>正在初始化...</div>

  if (isLoggedIn && profile) {
    return (
      <div>
        <img src={profile.pictureUrl} alt="Profile" />
        <h2>{profile.displayName}</h2>
        <p>{profile.statusMessage}</p>
        <small>User ID: {profile.userId}</small>
        <small>Token: {accessToken?.substring(0, 20)}...</small>
      </div>
    )
  }

  return <div>正在跳轉到 LINE 登入...</div>
}
```

查看 `apps/period-tracker` 的完整實作範例。
