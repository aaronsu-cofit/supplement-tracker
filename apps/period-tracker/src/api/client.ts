import axios, { AxiosInstance, AxiosError } from 'axios'
import { CycleSetupPayload, UpdateCycleSettingsPayload } from '@vitera/types'

/**
 * 檢測當前執行環境
 */
function detectEnvironment(): 'liff' | 'webview' | 'browser' {
  // 檢查 LIFF 環境
  if (typeof window !== 'undefined' && 'liff' in window) return 'liff'

  // 檢查 WebView 環境（由 Native App 注入的全域物件）
  if (typeof window !== 'undefined' && ('__nativeApp__' in window || '__bridge__' in window))
    return 'webview'

  return 'browser'
}

/**
 * 根據環境決定 Token 儲存策略
 */
function getTokenStorageStrategy(
  env: 'liff' | 'webview' | 'browser'
): 'memory' | 'localStorage' | 'bridge' {
  switch (env) {
    case 'liff':
      return 'memory' // LIFF 內存最安全
    case 'webview':
      return 'bridge' // 優先用 Native Bridge，備選 localStorage
    default:
      return 'localStorage' // 瀏覽器使用 localStorage
  }
}

/**
 * Period 資料類型
 */
export interface Period {
  id: string
  clientId: string
  startDate: string
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 創建 Period 的輸入
 */
export interface CreatePeriodInput {
  startDate: string // ISO 8601 格式
  endDate?: string // ISO 8601 格式
  notes?: string
}

/**
 * 查詢 Period 的參數
 */
export interface GetPeriodsQuery {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Period 查詢回應
 */
export interface GetPeriodsResponse {
  data: Period[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

/**
 * 認證回應
 */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

/**
 * API 錯誤
 */
export interface APIError {
  error: string
  message: string
}

/**
 * API Client 類別
 */
export class APIClient {
  private client: AxiosInstance
  private token: string | null = null
  private isRefreshing = false
  private refreshSubscribers: ((token: string) => void)[] = []
  private environment: 'liff' | 'webview' | 'browser'
  private storageStrategy: 'memory' | 'localStorage' | 'bridge'

  constructor(baseURL: string) {
    this.environment = detectEnvironment()
    this.storageStrategy = getTokenStorageStrategy(this.environment)

    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 根據環境載入 tokens
    this.loadTokens()

    // 請求攔截器：自動添加 Authorization header
    this.client.interceptors.request.use((config) => {
      if (this.token && config.url !== '/api/auth/line' && config.url !== '/api/auth/refresh') {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    // 回應攔截器：處理 401 錯誤並嘗試刷新 Token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<APIError>) => {
        const originalRequest = error.config
        if (
          error.response?.status === 401 &&
          originalRequest &&
          originalRequest.url !== '/api/auth/line' &&
          !(originalRequest as any)._retry
        ) {
          if (this.isRefreshing) {
            // 如果正在刷新中，將請求加入佇列，等待刷新完成
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                }
                resolve(this.client(originalRequest))
              })
            })
          }

          ;(originalRequest as any)._retry = true
          this.isRefreshing = true

          try {
            const newAccessToken = await this.refreshToken()
            this.isRefreshing = false
            this.onRefreshed(newAccessToken)
            this.refreshSubscribers = []

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            }
            return this.client(originalRequest)
          } catch (refreshError) {
            this.isRefreshing = false
            this.refreshSubscribers = []
            // 刷新失敗，清除 Token 並引導重新登入
            this.clearTokens()
            return Promise.reject(refreshError)
          }
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * 當 Token 刷新完成時，通知所有等待中的請求
   */
  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token))
  }

  /**
   * 根據環境策略載入 tokens
   */
  private loadTokens(): void {
    switch (this.storageStrategy) {
      case 'memory':
        // LIFF 環境：token 只在內存中
        this.token = null
        break
      case 'localStorage':
        // 瀏覽器環境：從 localStorage 讀取
        this.token = localStorage.getItem('accessToken')
        break
      case 'bridge':
        // WebView 環境：優先從 Bridge 取得
        if (typeof window !== 'undefined' && '__bridge__' in window) {
          const bridge = (window as any).__bridge__
          if (bridge && typeof bridge.getToken === 'function') {
            this.token = bridge.getToken()
          } else {
            this.token = localStorage.getItem('accessToken')
          }
        } else {
          this.token = localStorage.getItem('accessToken')
        }
        break
    }
  }

  /**
   * 根據環境策略儲存 tokens
   */
  private saveTokens(accessToken: string): void {
    this.token = accessToken

    switch (this.storageStrategy) {
      case 'memory':
        // 只存在內存中
        break
      case 'localStorage':
        localStorage.setItem('accessToken', accessToken)
        break
      case 'bridge':
        if (typeof window !== 'undefined' && '__bridge__' in window) {
          const bridge = (window as any).__bridge__
          if (bridge && typeof bridge.setToken === 'function') {
            bridge.setToken(accessToken)
          } else {
            localStorage.setItem('accessToken', accessToken)
          }
        } else {
          localStorage.setItem('accessToken', accessToken)
        }
        break
    }
  }

  /**
   * 根據環境策略清除 tokens
   */
  public clearTokens(): void {
    this.token = null

    switch (this.storageStrategy) {
      case 'memory':
        break
      case 'localStorage':
        localStorage.removeItem('accessToken')
        break
      case 'bridge':
        if (typeof window !== 'undefined' && '__bridge__' in window) {
          const bridge = (window as any).__bridge__
          if (bridge && typeof bridge.clearToken === 'function') {
            bridge.clearToken()
          } else {
            localStorage.removeItem('accessToken')
          }
        } else {
          localStorage.removeItem('accessToken')
        }
        break
    }
    // 注意：refreshToken 由 HttpOnly Cookie 管理，前端無法清除，但後端 logout 會處理
  }

  /**
   * 檢查是否已登入
   */
  public isAuthenticated(): boolean {
    return this.token !== null
  }

  /**
   * 取得當前 token
   */
  public getToken(): string | null {
    return this.token
  }

  /**
   * 取得當前 access token（別名方法，與 getToken 相同）
   */
  public getAccessToken(): string | null {
    return this.token
  }

  /**
   * 取得當前執行環境
   */
  public getEnvironment(): 'liff' | 'webview' | 'browser' {
    return this.environment
  }

  /**
   * 取得當前 client ID（從 token 或其他來源）
   * TODO: 實際實作需要根據後端 API 設計決定如何取得 clientId
   */
  public getClientId(): string | null {
    // 目前返回 null，未來可能需要從 token payload 解析或從 API 取得
    return null
  }

  /**
   * 使用現有 token 登入（用於測試或外部取得的 token）
   */
  public setToken(token: string): void {
    this.saveTokens(token)
  }

  /**
   * LINE LIFF 登入
   * 使用 LINE access token 換取 JWT token
   */
  async loginWithLine(lineAccessToken: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/line', {
      accessToken: lineAccessToken,
    })
    // 儲存 access token (refresh token 會由 HttpOnly Cookie 自動處理)
    this.saveTokens(response.data.accessToken)
    return response.data
  }

  /**
   * 刷新 Access Token
   */
  async refreshToken(): Promise<string> {
    // 不需要發送 refreshToken，後端會從 Cookie 讀取
    const response = await this.client.post<{ accessToken: string }>('/api/auth/refresh', {})

    const { accessToken } = response.data
    this.saveTokens(accessToken)
    return accessToken
  }

  /**
   * 創建新的經期記錄
   */
  async createPeriod(input: CreatePeriodInput): Promise<Period> {
    const response = await this.client.post<Period>('/api/periods', input)
    return response.data
  }

  /**
   * 查詢經期記錄
   */
  async getPeriods(query: GetPeriodsQuery = {}): Promise<Period[]> {
    const response = await this.client.get<Period[]>('/api/periods', {
      params: query,
    })
    return response.data
  }

  /**
   * 獲取用戶週期資料（設定與日誌）
   */
  async getCycleData(): Promise<{
    hasData: boolean
    lastPeriodStart: any
    periodDuration: number
    cycleLen: number
    dayData: Record<string, any>
  }> {
    const response = await this.client.get('/api/cycle/user')
    return response.data
  }

  /**
   * 初始引導設定
   */
  async setupCycle(payload: CycleSetupPayload): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/cycle/setup', payload)
    return response.data
  }

  /**
   * 更新用戶週期設定
   */
  async updateSettings(payload: UpdateCycleSettingsPayload): Promise<{ success: boolean }> {
    const response = await this.client.patch('/api/cycle/settings', payload)
    return response.data
  }

  /**
   * 儲存每日日誌
   * @param date - 日期，格式為 YYYY-MM-DD 或 YYYY-M-D（會自動轉換為 YYYY-MM-DD）
   * @param data - 日誌數據
   */
  async saveDailyLog(date: string, data: any): Promise<any> {
    // 統一日期格式為 YYYY-MM-DD
    const normalizedDate = this.normalizeDateFormat(date)
    const response = await this.client.post('/api/cycle/log', { date: normalizedDate, data })
    return response.data
  }

  /**
   * 將日期格式統一為 YYYY-MM-DD
   * @param date - 日期字符串，可以是 YYYY-M-D 或 YYYY-MM-DD 格式
   * @returns 標準化後的日期 YYYY-MM-DD
   */
  private normalizeDateFormat(date: string): string {
    const [year, month, day] = date.split('-').map((part) => part.trim())
    const paddedMonth = String(month).padStart(2, '0')
    const paddedDay = String(day).padStart(2, '0')
    return `${year}-${paddedMonth}-${paddedDay}`
  }
}

// 從環境變數取得 API URL，預設為空（同源請求，適用於 Vite Proxy）
const API_URL = import.meta.env.VITE_API_URL || ''

// 匯出單例實例
export const apiClient = new APIClient(API_URL)
