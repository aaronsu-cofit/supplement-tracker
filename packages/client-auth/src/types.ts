/**
 * 認證相關類型定義
 */

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
