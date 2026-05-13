import { useState, useEffect, useCallback } from 'react'
import type Liff from '@line/liff'
import { liffManager } from './liff-utils'

export interface UseLiffOptions {
  /**
   * LIFF ID - 可以從參數或環境變數取得
   */
  liffId: string | null | undefined

  /**
   * 是否自動初始化
   * @default true
   */
  autoInit?: boolean

  /**
   * 是否在初始化後自動登入（如果尚未登入）
   * 設為 true 時，初始化完成後若未登入會自動跳轉到 LINE 登入頁面
   * @default true
   */
  autoLogin?: boolean

  /**
   * 初始化成功後的回調
   */
  onInitSuccess?: (liff: typeof Liff) => void

  /**
   * 初始化失敗的回調
   */
  onInitError?: (error: Error) => void

  /**
   * 當已登入 LINE 時的回調，會傳入 LINE access token
   */
  onLoggedIn?: (accessToken: string) => void
}

export interface LiffProfile {
  /**
   * 使用者的 LINE ID
   */
  userId: string

  /**
   * 使用者的顯示名稱
   */
  displayName: string

  /**
   * 使用者的大頭貼 URL
   */
  pictureUrl?: string

  /**
   * 使用者的狀態訊息
   */
  statusMessage?: string
}

export interface UseLiffReturn {
  /**
   * LIFF SDK 實例
   */
  liff: typeof Liff | null

  /**
   * 是否已初始化
   */
  isInitialized: boolean

  /**
   * 是否正在初始化
   */
  isInitializing: boolean

  /**
   * 初始化錯誤訊息
   */
  error: string | null

  /**
   * 是否已登入 LINE
   */
  isLoggedIn: boolean

  /**
   * LINE access token（如果已登入）
   */
  accessToken: string | null

  /**
   * LINE 使用者資料（如果已登入）
   */
  profile: LiffProfile | null

  /**
   * 手動初始化 LIFF
   */
  init: () => Promise<void>

  /**
   * 執行 LINE 登入
   */
  login: () => void

  /**
   * 執行 LINE 登出
   */
  logout: () => void
}

/**
 * LINE LIFF React Hook
 *
 * @example
 * ```tsx
 * const { liff, isInitialized, isLoggedIn, accessToken, login } = useLiff({
 *   liffId: import.meta.env.VITE_LIFF_ID,
 *   onLoggedIn: async (lineAccessToken) => {
 *     // 使用 LINE access token 換取系統 JWT
 *     await apiClient.loginWithLine(lineAccessToken)
 *   }
 * })
 *
 * if (!isInitialized) return <div>Loading...</div>
 * if (!isLoggedIn) return <button onClick={login}>Login with LINE</button>
 * ```
 */
export function useLiff(options: UseLiffOptions): UseLiffReturn {
  const {
    liffId,
    autoInit = true,
    autoLogin = true,
    onInitSuccess,
    onInitError,
    onLoggedIn,
  } = options

  const [liff, setLiff] = useState<typeof Liff | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<LiffProfile | null>(null)

  const init = useCallback(async () => {
    // 如果沒有 liffId，直接返回（可能是其他 provider）
    if (!liffId) {
      return
    }

    if (isInitialized || isInitializing) {
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      // 動態載入 LIFF SDK（只加載一次，多個請求共用）
      const liffInstance = await liffManager.load()

      await liffInstance.init({ liffId })
      setLiff(liffInstance)
      setIsInitialized(true)

      // 檢查登入狀態
      const loggedIn = liffInstance.isLoggedIn()
      setIsLoggedIn(loggedIn)

      if (loggedIn) {
        const token = liffInstance.getAccessToken()
        setAccessToken(token)

        // 取得使用者資料
        try {
          const userProfile = await liffInstance.getProfile()
          setProfile(userProfile)
        } catch (err) {
          console.warn('Failed to get LINE profile:', err)
        }

        if (token && onLoggedIn) {
          onLoggedIn(token)
        }
      } else if (autoLogin) {
        // 如果未登入且啟用自動登入，自動跳轉到 LINE 登入頁面
        liffInstance.login()
        return // 登入後會重新載入頁面，不需要繼續執行
      }

      onInitSuccess?.(liffInstance)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'LIFF initialization failed'
      setError(errorMsg)
      onInitError?.(err instanceof Error ? err : new Error(errorMsg))
    } finally {
      setIsInitializing(false)
    }
  }, [liffId, isInitialized, isInitializing, onInitSuccess, onInitError, onLoggedIn])

  const login = useCallback(() => {
    if (liff && !isLoggedIn) {
      liff.login()
    }
  }, [liff, isLoggedIn])

  const logout = useCallback(() => {
    if (liff && isLoggedIn) {
      liff.logout()
      setIsLoggedIn(false)
      setAccessToken(null)
      setProfile(null)
    }
  }, [liff, isLoggedIn])

  // 自動初始化
  useEffect(() => {
    if (autoInit && liffId && !isInitialized && !isInitializing) {
      init()
    }
  }, [autoInit, liffId, isInitialized, isInitializing, init])

  return {
    liff,
    isInitialized,
    isInitializing,
    error,
    isLoggedIn,
    accessToken,
    profile,
    init,
    login,
    logout,
  }
}
