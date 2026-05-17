import { DayLog } from '../types'
import { saveDailyLog } from '../api/client'

/**
 * 同步日誌變更到後端
 * 只負責同步每日日誌記錄
 * @param keysToUpdate - 需要更新的日期鍵陣列
 * @param newDayData - 更新後的日誌資料
 */
export const syncPeriodChanges = async (
  keysToUpdate: string[],
  newDayData: Record<string, DayLog>
) => {
  // 同步日誌
  await Promise.all(keysToUpdate.map((k) => saveDailyLog(k, newDayData[k])))
}
