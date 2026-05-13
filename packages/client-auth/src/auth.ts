/**
 * 用戶認證相關的 API 函數
 */

import { apiFetch } from '@vitera/utils'
import type { AuthResponse } from './types'

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
