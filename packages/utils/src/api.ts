/**
 * 通用 API 工具函數
 * 跨平台支持：Vite、Next.js、Node.js 環境
 */

/**
 * 獲取 API 基礎 URL
 *
 * 跨平台環境檢測邏輯：
 * 1. Vite 應用（本地開發）：
 *    - DEV 模式：使用相對路徑 ''（讓 Vite 代理攔截）
 *    - Prod 模式：使用 VITE_API_URL 環境變數
 *
 * 2. Next.js 應用（本地開發）：
 *    - DEV 模式：使用相對路徑 ''（Next.js 預設代理到後端）
 *    - Prod 模式：使用 NEXT_PUBLIC_API_URL 環境變數
 *
 * 3. Node.js 環境（後端或 SSR）：
 *    - 使用環境變數 API_URL
 *
 * @returns API 基礎 URL 或相對路徑
 */
function getApiUrl(): string {
  // ===== Vite 環境檢測 =====
  try {
    // @ts-expect-error - import.meta 在 Node.js 環境中不存在
    // eslint-disable-next-line no-undef
    if (import.meta?.env) {
      // 本地開發（Vite DEV 模式）：使用相對路徑
      // @ts-expect-error
      if (import.meta.env.DEV) {
        return ''
      }
      // 生產環境（Vite Prod 模式）：使用 VITE_API_URL
      // @ts-expect-error
      const viteUrl = import.meta.env.VITE_API_URL
      if (viteUrl) {
        return viteUrl
      }
    }
  } catch {
    // 不是 Vite 環境，繼續檢測其他環境
  }

  // ===== Node.js 環境檢測（process.env）=====
  if (typeof process !== 'undefined' && process.env) {
    // 本地開發（Node.js dev 模式）：使用相對路徑
    if (process.env.NODE_ENV === 'development') {
      return ''
    }

    // 生產環境：優先使用 NEXT_PUBLIC_API_URL（Next.js），其次使用 API_URL（Node.js）
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    if (process.env.API_URL) {
      return process.env.API_URL
    }
  }

  // 預設值
  return ''
}

/**
 * API 請求選項
 */
interface ApiFetchOptions {
  method?: string
  body?: string | FormData
  headers?: Record<string, string>
  [key: string]: unknown
}

/**
 * 通用 API 調用函數
 *
 * 特點：
 * 1. 使用原生 fetch API，無需第三方庫（如 axios）
 * 2. 自動處理 Content-Type header（JSON/FormData 識別）
 * 3. 使用 credentials: 'include' 確保 HttpOnly cookies 被自動發送
 * 4. 搭配 Vite 代理或反向代理，支持相對路徑和絕對路徑
 *
 * 使用場景：
 * - 本地開發：相對路徑 '/api/...' → Vite 代理攔截 → 轉發到後端
 * - 生產環境：絕對路徑 'https://api.example.com/api/...' → 直接請求後端
 *
 * @param path - API 路徑（如 '/api/cycle/user'）
 * @param options - fetch 選項（method, body, headers 等）
 * @returns fetch Response 物件
 *
 * @example
 * // 發送 POST 請求
 * const response = await apiFetch('/api/auth/me', {
 *   method: 'POST',
 *   body: JSON.stringify({ userId: '123' }),
 * });
 *
 * @example
 * // 發送 GET 請求
 * const response = await apiFetch('/api/cycle/user');
 *
 * @example
 * // 上傳文件
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * const response = await apiFetch('/api/upload', {
 *   method: 'POST',
 *   body: formData,
 * });
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  // 根據環境獲取 API 基礎 URL
  // - 本地開發：'' (相對路徑，Vite 代理會攔截 /api/* 並轉發)
  // - 生產環境：'https://api.example.com' (絕對路徑)
  const baseUrl = getApiUrl()

  // 判斷 request body 是否為 FormData（用於文件上傳）
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  // 構建 headers
  // - FormData 自帶 boundary，不需要手動設置 Content-Type
  // - 其他情況默認使用 application/json
  // - 保留 options.headers 中的自訂 header
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  // 發送請求
  // credentials: 'include' 是關鍵，確保：
  // 1. 後端返回的 Set-Cookie header 被瀏覽器接受並存儲
  // 2. 後續請求會自動攜帶存儲的 cookies（包括 HttpOnly cookies）
  const response = await fetch(baseUrl + path, {
    ...options,
    headers,
    credentials: 'include',
  })

  return response
}
