import { UserData, DayLog } from '../types'
import { saveDailyLog, updateSettings } from '../api/client'

/**
 * 同步選項
 */
interface SyncOptions {
  /** 是否更新最後一次經期開始日期 */
  updateLastStart?: boolean
  /** 新的週期長度 */
  newCycleLen?: number
  /** 是否清除整個週期 */
  clearEntireCycle?: boolean
}

/**
 * 同步週期變更到後端
 * 先同步個別日誌記錄，然後同步使用者設定（如有變更）
 * @param keysToUpdate - 需要更新的日期鍵陣列
 * @param newDayData - 更新後的日誌資料
 * @param newUserData - 更新後的使用者資料
 * @param options - 同步選項，包括是否更新設定相關的標記
 */
export const syncPeriodChanges = async (
  keysToUpdate: string[],
  newDayData: Record<string, DayLog>,
  newUserData: UserData,
  options: SyncOptions = {}
) => {
  // 同步日誌
  await Promise.all(keysToUpdate.map((k) => saveDailyLog(k, newDayData[k])))

  // 只有在確實有設定變更時，才同步使用者設定
  // 注意：updateLastStart, newCycleLen, clearEntireCycle 這些選項表示設定確實有變更
  const shouldUpdateSettings = Boolean(options.updateLastStart || options.newCycleLen || options.clearEntireCycle)

  if (shouldUpdateSettings) {
    await updateSettings({
      periodDuration: newUserData.periodDuration,
      cycleLen: newUserData.cycleLen,
      lastPeriodStart: newUserData.lastPeriodStart,
    })
  }
}
