/**
 * LIFF SDK 相關的 utility 函數
 */

/**
 * 動態載入 LIFF SDK
 * @returns LIFF 實例
 * @throws Error - 如果載入失敗
 */
async function loadLiff(): Promise<any> {
  const { default: liff } = await import('@line/liff')
  return liff
}

/**
 * 管理 LIFF SDK 的加載和狀態
 * - 避免重複加載 SDK
 * - 多個地方同時請求時共用同一個加載 Promise
 * - 統一錯誤處理
 */
class LiffManager {
  private static instance: LiffManager
  private liff: any = null
  private loadingPromise: Promise<any> | null = null

  private constructor() {}

  static getInstance(): LiffManager {
    if (!LiffManager.instance) {
      LiffManager.instance = new LiffManager()
    }
    return LiffManager.instance
  }

  /**
   * 動態加載 LIFF SDK（只加載一次）
   * 多個地方同時請求時，共用同一個加載 Promise
   * @returns LIFF 實例
   * @throws Error - 如果載入失敗
   */
  async load(): Promise<any> {
    if (this.liff) {
      return this.liff
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = loadLiff()
    try {
      this.liff = await this.loadingPromise
      return this.liff
    } finally {
      this.loadingPromise = null
    }
  }

  /**
   * 獲取已加載的 LIFF 實例
   * @returns LIFF 實例
   * @throws Error - 如果 LIFF 尚未加載
   */
  getInstance(): any {
    if (!this.liff) {
      throw new Error('LIFF not loaded. Call load() first.')
    }
    return this.liff
  }

  /**
   * 重置狀態（用於測試或其他場景）
   */
  reset(): void {
    this.liff = null
    this.loadingPromise = null
  }
}

export const liffManager = LiffManager.getInstance()
