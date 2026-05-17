/**
 * 用戶認證相關的 API 函數
 */

import { apiFetch } from '@vitera/utils'
import { liffManager } from './liff-utils'
import type { AuthResponse } from './types'

/**
 * 從 LIFF SDK 取得 access token 並進行後端登入
 *
 * 流程：
 * 1. 透過 liff.getAccessToken() 取得 LIFF access token
 * 2. 發送 POST /api/auth/me 請求到後端（帶 accessToken）
 * 3. 後端向 LINE API 驗證 token，取得真實 userId / displayName / pictureUrl
 * 4. 後端建立或更新用戶，透過 Set-Cookie 設置 httpOnly auth_token
 *
 * @returns AuthResponse - 包含認證狀態和用戶信息
 * @throws Error - 如果 LIFF 不可用、token 取得失敗或登入失敗
 */
export async function handleLiffLogin(): Promise<AuthResponse> {
  const liff = await liffManager.load()

  const accessToken = liff.getAccessToken()
  if (!accessToken) {
    throw new Error('LIFF access token unavailable — user may not be logged in')
  }

  return loginWithLine(accessToken)
}

/**
 * LINE LIFF 登入（帶 access token）
 *
 * 發送 accessToken 給後端，由後端向 LINE API 驗證並取得真實用戶資料。
 * 避免客戶端直接傳入 lineUserId 造成的身份偽造風險。
 *
 * @param accessToken - liff.getAccessToken() 取得的 token
 * @returns AuthResponse - 包含認證狀態和用戶信息
 * @throws Error - 如果登入失敗
 */
export async function loginWithLine(accessToken: string): Promise<AuthResponse> {
  const response = await apiFetch('/api/auth/me', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  })
  if (!response.ok) {
    throw new Error(`POST /api/auth/me failed with status ${response.status}`)
  }
  return response.json()
}
