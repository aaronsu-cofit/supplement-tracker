import { DayLog, PbacLog } from '../types'
import { MESSAGES } from './messages'

/**
 * 創建 PBAC 記錄條目
 * 將單次經血量紀錄包裝成 PbacLog 並整合進 DayLog 中
 * @param currentDayData - 當前的每日紀錄資料
 * @param pbacLog - 部分 PBAC 日誌資料（通常包含 level）
 * @param product - 使用的衛生用品類型
 * @param bloodColor - 經血顏色
 * @param clot - 血塊情況
 * @returns 更新後的每日紀錄資料
 */
export const createPbacEntry = (
  currentDayData: DayLog | undefined,
  pbacLog: Partial<PbacLog>,
  product: string,
  bloodColor: string,
  clot: string
): DayLog => {
  const currentLogs = currentDayData?.pbacLogs || []
  const newLog = {
    ...pbacLog,
    id: Date.now(),
    color: bloodColor,
    clot: clot,
    product: product as 'pad' | 'tampon' | 'cup',
    time: new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  } as PbacLog

  return {
    ...(currentDayData || {}),
    period: true,
    pbacLogs: [...currentLogs, newLog],
    pbacProduct: product as 'pad' | 'tampon' | 'cup',
    bloodColor, // Keep latest at top level for summary
    clot, // Keep latest at top level for summary
  }
}

/**
 * 獲取週期變更後的反饋消息
 * 根據操作類型返回對應的國際化訊息
 * @param clearEntireCycle - 是否清除整個週期
 * @param clearFollowing - 是否清除後續天數
 * @param autoMarkDays - 自動標記的天數
 * @returns 提示訊息字串
 */
export const getToggleFeedbackMessage = (
  clearEntireCycle: boolean,
  clearFollowing: boolean,
  autoMarkDays?: number
): string => {
  if (clearEntireCycle) return MESSAGES.PERIOD.CLEAR_ENTIRE_CYCLE
  if (clearFollowing) return MESSAGES.PERIOD.CLEAR_FOLLOWING
  if (autoMarkDays && autoMarkDays > 1) return MESSAGES.PERIOD.MARKED_DAYS(autoMarkDays)
  return ''
}
