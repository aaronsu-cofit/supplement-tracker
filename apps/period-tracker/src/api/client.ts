/// <reference lib="dom" />
import { apiFetch } from '@vitera/utils'
import { CycleSetupPayload, UpdateCycleSettingsPayload } from '@vitera/types'

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
  authenticated: boolean
  user: {
    id: string
    displayName: string
    pictureUrl?: string
    authProvider: string
    role: string
    userType: string
  }
}

/**
 * API 錯誤
 */
export interface APIError {
  error: string
  message: string
}

// apiFetch 已移至 @vitera/utils，從那裡導入

/**
 * LINE LIFF 登入
 *
 * 流程：
 * 1. 從 LINE LIFF 上下文獲取用戶信息（lineUserId, displayName, pictureUrl）
 * 2. 發送 POST /api/auth/me 請求到後端
 * 3. 後端驗證 lineUserId 並創建用戶（如需要）
 * 4. 後端通過 Set-Cookie header 設置 httpOnly cookie（auth_token）
 * 5. 瀏覽器自動存儲並在後續請求中攜帶此 cookie
 *
 * @param lineUserId - LINE 用戶 ID
 * @param displayName - LINE 用戶顯示名稱
 * @param pictureUrl - LINE 用戶頭像 URL
 * @returns AuthResponse - 包含認證狀態和用戶信息
 * @throws Error - 如果登入失敗
 */
export async function loginWithLine(
  lineUserId: string,
  displayName?: string,
  pictureUrl?: string
): Promise<AuthResponse> {
  const response = await apiFetch('/api/auth/me', {
    method: 'POST',
    body: JSON.stringify({
      lineUserId,
      displayName,
      pictureUrl,
    }),
  })
  if (!response.ok) {
    throw new Error(`POST /api/auth/me failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 創建新的經期記錄
 */
export async function createPeriod(input: CreatePeriodInput): Promise<Period> {
  const response = await apiFetch('/api/periods', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error(`POST /api/periods failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 查詢經期記錄
 */
export async function getPeriods(query: GetPeriodsQuery = {}): Promise<Period[]> {
  const searchParams = new URLSearchParams()
  if (query.startDate) searchParams.set('startDate', query.startDate)
  if (query.endDate) searchParams.set('endDate', query.endDate)
  if (query.limit) searchParams.set('limit', String(query.limit))
  if (query.offset) searchParams.set('offset', String(query.offset))

  const queryString = searchParams.toString()
  const path = `/api/periods${queryString ? '?' + queryString : ''}`

  const response = await apiFetch(path)
  if (!response.ok) {
    throw new Error(`GET /api/periods failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 獲取用戶週期資料（設定與日誌）
 */
export async function getCycleData(): Promise<{
  hasData: boolean
  lastPeriodStart: any
  periodDuration: number
  cycleLen: number
  dayData: Record<string, any>
}> {
  const response = await apiFetch('/api/cycle/user')
  if (!response.ok) {
    throw new Error(`GET /api/cycle/user failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 初始引導設定
 */
export async function setupCycle(payload: CycleSetupPayload): Promise<{ success: boolean }> {
  const response = await apiFetch('/api/cycle/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`POST /api/cycle/setup failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 更新用戶週期設定
 */
export async function updateSettings(payload: UpdateCycleSettingsPayload): Promise<{ success: boolean }> {
  const response = await apiFetch('/api/cycle/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`PATCH /api/cycle/settings failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 儲存每日日誌
 * @param date - 日期，格式為 YYYY-MM-DD 或 YYYY-M-D（會自動轉換為 YYYY-MM-DD）
 * @param data - 日誌數據
 */
export async function saveDailyLog(date: string, data: any): Promise<any> {
  // 統一日期格式為 YYYY-MM-DD
  const normalizedDate = normalizeDateFormat(date)
  const response = await apiFetch('/api/cycle/log', {
    method: 'POST',
    body: JSON.stringify({ date: normalizedDate, data }),
  })
  if (!response.ok) {
    throw new Error(`POST /api/cycle/log failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * 將日期格式統一為 YYYY-MM-DD
 * @param date - 日期字符串，可以是 YYYY-M-D 或 YYYY-MM-DD 格式
 * @returns 標準化後的日期 YYYY-MM-DD
 */
function normalizeDateFormat(date: string): string {
  const [year, month, day] = date.split('-').map((part) => part.trim())
  const paddedMonth = String(month).padStart(2, '0')
  const paddedDay = String(day).padStart(2, '0')
  return `${year}-${paddedMonth}-${paddedDay}`
}
