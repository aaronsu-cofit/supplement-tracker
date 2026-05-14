import { UserData, DayLog, PbacLog } from '../types'
import { saveDailyLog, getCycleData } from '../api/client'
import {
  getPeriodAction,
  calculatePeriodUpdate,
  calculateNewCycleLength,
  applyPeriodChangesToDayData,
  buildUpdatedUserData,
} from './periodLogic'
import { createPbacEntry, getToggleFeedbackMessage } from './pbacOperations'
import { syncPeriodChanges } from './sync'
import { formatDate } from '@vitera/utils'
import { MESSAGES } from './messages'

/**
 * 執行異步操作並統一處理錯誤
 * 封裝了 try-catch 邏輯與 Toast 提示
 * @param operation - 要執行的異步操作函式
 * @param successMessage - 成功時顯示的消息
 * @param errorMessage - 失敗時顯示的消息
 * @param errorLog - 控制台錯誤日誌前綴
 * @param onShowToast - 顯示提示的回調函數
 */
const _executeWithErrorHandling = async (
  operation: () => Promise<void>,
  successMessage: string,
  errorMessage: string,
  errorLog: string,
  onShowToast: (msg: string) => void
) => {
  try {
    await operation()
    onShowToast(successMessage)
  } catch (error) {
    console.error(errorLog, error)
    onShowToast(errorMessage)
  }
}

/**
 * 主要的經期標記/取消互動處理器
 * 根據日期和現有數據判斷操作類型（標記/取消），處理延伸/新週期邏輯，並在需要時觸發確認對話框
 * @param date - 要標記或取消的日期
 * @param userData - 當前使用者資料
 * @param options - 回調與通知選項
 * @param options.onShowModal - 顯示確認對話框的回調函數（用於取消多日經期時）
 * @param options.onUpdateUserData - 更新本地狀態的回調函數
 * @param options.onShowToast - 顯示提示訊息的回調函數
 */
export const handlePeriodToggle = async (
  date: Date,
  userData: UserData,
  options: {
    onShowModal: (params: { mode: 'first-day' | 'middle-day'; date: Date; count: number }) => void
    onUpdateUserData: (data: UserData) => void
    onShowToast: (msg: string) => void
  }
) => {
  const action = getPeriodAction(date, userData)

  if (action.type === 'cancel') {
    // 取消經期邏輯：根據 PRD 1.0.1
    // 判斷是否有後續紀錄（PBAC、症狀、情緒、血液顏色、衛生產品）
    const hasFollowingRecords = action.successors && action.successors > 0 && action.hasRecords

    if (hasFollowingRecords) {
      // 有後續紀錄，顯示確認對話框讓用戶選擇
      options.onShowModal({
        mode: action.mode as 'first-day' | 'middle-day',
        date,
        count: action.successors!,
      })
      return
    } else {
      // 無後續紀錄，直接執行預設清除邏輯（無需對話框）
      await performPeriodToggle(date, userData, {
        isPeriod: false,
        clearEntireCycle: action.mode === 'first-day',
        clearFollowing: action.mode === 'middle-day',
        onUpdateUserData: options.onUpdateUserData,
        onShowToast: options.onShowToast,
      })
      return
    }
  } else {
    // 標記經期邏輯
    if (action.mode === 'extend') {
      // 延伸模式：只標記本日
      await performPeriodToggle(date, userData, {
        isPeriod: true,
        onUpdateUserData: options.onUpdateUserData,
        onShowToast: options.onShowToast,
      })
    } else {
      // 新週期模式：根據預設經期長度自動標記多日
      const newCycleLen = calculateNewCycleLength(date, userData.lastPeriodStart, userData.cycleLen)

      await performPeriodToggle(date, userData, {
        isPeriod: true,
        autoMarkDays: userData.periodDuration || 5,
        newCycleLen,
        updateLastStart: true,
        onUpdateUserData: options.onUpdateUserData,
        onShowToast: options.onShowToast,
      })
    }
  }
}

/**
 * 執行週期狀態變更並同步到遠端服務
 * 封裝了本地狀態更新與後端 API 呼叫的完整流程
 * @param date - 操作目標日期
 * @param userData - 當前使用者資料
 * @param options - 變更配置選項
 * @param options.isPeriod - 目標狀態是否為經期
 * @param options.clearFollowing - 是否清除此日期後的所有連續紀錄
 * @param options.clearEntireCycle - 是否清除整個經期週期
 * @param options.autoMarkDays - 開啟新週期時自動標記的天數
 * @param options.newCycleLen - 更新後的預期週期長度
 * @param options.updateLastStart - 是否更新 lastPeriodStart 基準日
 * @param options.onUpdateUserData - 更新本地資料的實例回調
 * @param options.onShowToast - 顯示操作結果反饋的回調
 */
export const performPeriodToggle = async (
  date: Date,
  userData: UserData,
  options: {
    isPeriod: boolean
    clearFollowing?: boolean
    clearEntireCycle?: boolean
    autoMarkDays?: number
    newCycleLen?: number
    updateLastStart?: boolean
    onUpdateUserData: (data: UserData) => void
    onShowToast: (msg: string) => void
  }
) => {
  const result = calculatePeriodUpdate(date, userData, {
    isPeriod: options.isPeriod,
    clearFollowing: options.clearFollowing,
    clearEntireCycle: options.clearEntireCycle,
    autoMarkDays: options.autoMarkDays,
    newCycleLen: options.newCycleLen,
    updateLastStart: options.updateLastStart,
  })

  const newDayData = applyPeriodChangesToDayData(
    userData.dayData,
    result.keysToUpdate,
    result.isPeriod
  )

  const newUserData = buildUpdatedUserData(userData, newDayData, result)

  // 更新本地 UI 狀態（樂觀更新）
  options.onUpdateUserData(newUserData)

  try {
    // 同步變更至後端資料庫
    await syncPeriodChanges(result.keysToUpdate, newDayData, newUserData, {
      updateLastStart: options.updateLastStart,
      newCycleLen: options.newCycleLen,
      clearEntireCycle: options.clearEntireCycle,
    })

    // 如果清除了整個週期，重新獲取後端資料以確保前後端同步
    if (options.clearEntireCycle) {
      try {
        const updatedData = await getCycleData()
        options.onUpdateUserData(updatedData)
      } catch (error) {
        console.error('Failed to refresh cycle data after clearing:', error)
        // 即使重新獲取失敗，也不影響用戶體驗，只記錄錯誤
      }
    }

    // 顯示對應的操作回饋
    const message = getToggleFeedbackMessage(
      options.clearEntireCycle || false,
      options.clearFollowing || false,
      options.autoMarkDays
    )
    if (message) {
      options.onShowToast(message)
    }
  } catch (error) {
    console.error('Failed to sync period changes:', error)
    options.onShowToast(MESSAGES.SYNC.PERIOD_SYNC_FAILED)
  }
}

/**
 * 保存與特定日期相關的自定義紀錄（如症狀、情緒、經期用品）
 * @param key - 日期金鑰 (YYYY-M-D)
 * @param data - 要保存的部分 DayLog 資料
 * @param userData - 當前使用者資料
 * @param onUpdateUserData - 更新狀態的回調
 * @param onShowToast - 顯示通知的回調
 */
export const handleSaveDailyLog = async (
  key: string,
  data: Partial<DayLog>,
  userData: UserData,
  onUpdateUserData: (data: UserData) => void,
  onShowToast: (msg: string) => void
) => {
  const newDayData = { ...userData.dayData }
  newDayData[key] = { ...newDayData[key], ...data }
  const newUserData = { ...userData, dayData: newDayData }

  onUpdateUserData(newUserData)

  await _executeWithErrorHandling(
    () => saveDailyLog(key, data),
    MESSAGES.DAILY_LOG.SAVED,
    MESSAGES.DAILY_LOG.SAVE_FAILED,
    'Failed to save daily log:',
    onShowToast
  )
}

/**
 * 新增一筆單次 PBAC 經血量紀錄
 * 包含浸透程度、用品、顏色及血塊資訊
 * @param pbacLog - 部分 PBAC 紀錄資料
 * @param product - 用品類型名稱
 * @param bloodColor - 顏色 ID
 * @param clot - 血塊情況 ID
 * @param userData - 當前使用者資料
 * @param onUpdateUserData - 更新狀態的回調
 * @param onShowToast - 顯示通知的回調
 * @param onCloseOverlay - 關閉紀錄面板的回調
 */
export const handleAddPbacLog = async (
  pbacLog: Partial<PbacLog>,
  product: string,
  bloodColor: string,
  clot: string,
  userData: UserData,
  onUpdateUserData: (data: UserData) => void,
  onShowToast: (msg: string) => void,
  onCloseOverlay: () => void
) => {
  const key = formatDate(new Date())
  const newDayData = { ...userData.dayData }
  const currentDayData = newDayData[key]

  // 創建完整的 DayLog（用於前端 UI 更新）
  newDayData[key] = createPbacEntry(currentDayData, pbacLog, product, bloodColor, clot)

  const newUserData = { ...userData, dayData: newDayData }
  onUpdateUserData(newUserData)
  onCloseOverlay()

  // 發送完整的 DayLog 到後端（後端會直接蓋掉）
  const createdLog = newDayData[key]

  await _executeWithErrorHandling(
    () =>
      saveDailyLog(key, {
        period: createdLog.period,
        pbacProduct: createdLog.pbacProduct,
        pbacLogs: createdLog.pbacLogs,
        symptoms: createdLog.symptoms,
        emotions: createdLog.emotions,
      }),
    MESSAGES.PBAC.LOGGED,
    MESSAGES.PBAC.SYNC_FAILED,
    'Failed to save PBAC log:',
    onShowToast
  )
}
