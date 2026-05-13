import { UserData, DayLog } from '../types'
import {
  formatDate,
  daysDifference,
  createDateFromYMD,
  MILLISECONDS_PER_DAY,
  hasPeriodRecords as hasRecords,
} from '@repo/utils'

/**
 * 計算新週期長度（用於標記新經期時）
 * 根據點擊日期與上次經期開始日期的差值，判斷是否在 21-45 天的有效範圍內
 * @param clickedDate - 用戶點擊的日期
 * @param lastPeriodStart - 上次經期的開始日期
 * @param currentCycleLen - 當前的週期長度設定
 * @returns 新的週期長度（若在範圍內則更新，否則保持原樣）
 */
export const calculateNewCycleLength = (
  clickedDate: Date,
  lastPeriodStart: { y: number; m: number; d: number } | null,
  currentCycleLen: number
): number => {
  if (!lastPeriodStart) return currentCycleLen

  const ps = createDateFromYMD(lastPeriodStart.y, lastPeriodStart.m, lastPeriodStart.d)
  const diffDays = daysDifference(clickedDate, ps)

  if (diffDays >= 21 && diffDays <= 45) {
    return diffDays
  }
  return currentCycleLen
}

/**
 * 應用週期變更到 dayData
 * 更新指定日期的經期標記，並根據需要初始化或清除相關紀錄
 * @param dayData - 當前的所有每日紀錄
 * @param keysToUpdate - 需要更新的日期金鑰陣列
 * @param isPeriod - 是否標記為經期
 * @returns 更新後的 dayData 對象
 */
export const applyPeriodChangesToDayData = (
  dayData: Record<string, DayLog>,
  keysToUpdate: string[],
  isPeriod: boolean
): Record<string, DayLog> => {
  const newDayData = { ...dayData }

  keysToUpdate.forEach((k) => {
    const existing = newDayData[k] || {}
    newDayData[k] = { ...existing, period: isPeriod }

    if (isPeriod) {
      // 標記為經期時，初始化紀錄陣列
      if (!newDayData[k].pbacLogs) newDayData[k].pbacLogs = []
      if (!newDayData[k].symptoms) newDayData[k].symptoms = []
      if (!newDayData[k].emotions) newDayData[k].emotions = []
    } else {
      // 取消經期時，清空所有紀錄（無論是否清除整個週期）
      newDayData[k].pbacLogs = []
      newDayData[k].symptoms = []
      newDayData[k].emotions = []
      delete newDayData[k].pbacProduct
      delete newDayData[k].bloodColor
      delete newDayData[k].clot
    }
  })

  return newDayData
}

/**
 * 構建修改後的 UserData 對象
 * 整合更新後的 dayData、基準日期與週期長度
 * @param userData - 原始 UserData
 * @param newDayData - 更新後的 dayData
 * @param periodUpdateResult - 週期更新計算結果
 * @returns 完整的更新後 UserData 對象
 */
export const buildUpdatedUserData = (
  userData: UserData,
  newDayData: Record<string, DayLog>,
  periodUpdateResult: PeriodUpdateResult
): UserData => {
  return {
    ...userData,
    dayData: newDayData,
    lastPeriodStart: periodUpdateResult.newLastPeriodStart || null,
    cycleLen: periodUpdateResult.newCycleLen || userData.cycleLen,
  }
}

export interface PeriodAction {
  type: 'mark' | 'cancel'
  mode?: 'extend' | 'new-cycle' | 'first-day' | 'middle-day'
  successors?: number
  hasRecords?: boolean
}

/**
 * 判斷點擊日期的經期操作類型
 * 區分是標記（延伸或新週期）還是取消（首日或中/末日），並掃描相關紀錄
 * @param date - 被點擊的日期
 * @param userData - 使用者資料
 * @returns 描述操作類型、模式與資料依賴的對象
 */
export const getPeriodAction = (date: Date, userData: UserData): PeriodAction => {
  const key = formatDate(date)
  const isCurrentlyPeriod = userData.dayData[key]?.period === true

  if (isCurrentlyPeriod) {
    // 取消邏輯：判斷是首日還是中間日
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevKey = formatDate(prevDate)
    const hasPrev = userData.dayData[prevKey]?.period === true

    let successors = 0
    let successorHasRecords = false

    // 檢查當前日期是否有紀錄
    const todayData = userData.dayData[key]
    const todayHasRecords = hasRecords(todayData)

    // 掃描後續 60 天以確認連續天數與是否有紀錄
    for (let i = 1; i <= 60; i++) {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + i)
      const nk = formatDate(nextDate)
      const day = userData.dayData[nk]

      if (day?.period === true) {
        successors++
        if (hasRecords(day)) {
          successorHasRecords = true
        }
      } else if (successors > 0) break
    }

    return {
      type: 'cancel',
      mode: hasPrev ? 'middle-day' : 'first-day',
      successors,
      hasRecords: todayHasRecords || successorHasRecords,
    }
  } else {
    // 標記邏輯：判斷是延伸現有週期還是開啟新週期
    let lastPeriodStart: Date | null = null
    if (userData.lastPeriodStart) {
      lastPeriodStart = createDateFromYMD(
        userData.lastPeriodStart.y,
        userData.lastPeriodStart.m,
        userData.lastPeriodStart.d
      )
    }

    const periodDuration = userData.periodDuration || 5
    const lastPeriodEnd = lastPeriodStart
      ? new Date(lastPeriodStart.getTime() + (periodDuration - 1) * MILLISECONDS_PER_DAY)
      : null

    // PRD: 點擊日期 <= 上次結束日 + 1 天 視為延伸
    // 但前提是該日期附近已經有經期標記的日期（表示延伸現有週期）
    // 否則視為新週期（自動標記多天）
    let isExtend = false
    if (lastPeriodEnd && date.getTime() <= lastPeriodEnd.getTime() + MILLISECONDS_PER_DAY) {
      // 檢查是否在該日期之前有連續的經期標記
      const checkDate = new Date(date)
      checkDate.setDate(checkDate.getDate() - 1)
      const prevKey = formatDate(checkDate)
      isExtend = userData.dayData[prevKey]?.period === true
    }

    return {
      type: 'mark',
      mode: isExtend ? 'extend' : 'new-cycle',
    }
  }
}

export interface PeriodUpdateResult {
  keysToUpdate: string[]
  newLastPeriodStart?: { y: number; m: number; d: number }
  newCycleLen?: number
  isPeriod: boolean
  clearEntireCycle?: boolean
}

/**
 * 計算週期更新所需的資料變更
 * 生成受影響的日期金鑰，並根據 PRD 規則更新週期基準日與長度
 * @param date - 操作日期
 * @param userData - 使用者資料
 * @param options - 更新選項（是否標記、是否清除整個週期等）
 * @returns 包含待更新日期與新狀態的結果對象
 */
export const calculatePeriodUpdate = (
  date: Date,
  userData: UserData,
  options: {
    isPeriod: boolean
    clearFollowing?: boolean
    clearEntireCycle?: boolean
    autoMarkDays?: number
    newCycleLen?: number
    updateLastStart?: boolean
  }
): PeriodUpdateResult => {
  const { isPeriod, clearFollowing, clearEntireCycle, autoMarkDays, newCycleLen, updateLastStart } =
    options
  const keysToUpdate: string[] = []

  if (isPeriod) {
    // 標記模式：若有 autoMarkDays 則向後自動標記
    const count = autoMarkDays || 1
    for (let i = 0; i < count; i++) {
      const d = new Date(date)
      d.setDate(d.getDate() + i)
      const k = formatDate(d)
      keysToUpdate.push(k)
    }
  } else {
    // 取消模式：掃描受影響的連續日期
    const key = formatDate(date)
    keysToUpdate.push(key)
    if (clearFollowing || clearEntireCycle) {
      const checkDate = new Date(date)
      while (true) {
        checkDate.setDate(checkDate.getDate() + 1)
        const nk = formatDate(checkDate)
        if (userData.dayData[nk]?.period === true) {
          keysToUpdate.push(nk)
        } else break
      }
    }
  }

  let newLastPeriodStart = userData.lastPeriodStart || undefined
  if (updateLastStart) {
    // 開啟新週期：更新基準日
    newLastPeriodStart = {
      y: date.getFullYear(),
      m: date.getMonth() + 1,
      d: date.getDate(),
    }
  } else if (clearEntireCycle) {
    // 清除全週期：抹除基準日
    newLastPeriodStart = undefined
  } else if (!isPeriod && userData.lastPeriodStart) {
    // PRD 1.0.1: 取消首日且只取消本日時，若明天仍是經期，則基準日順延
    const isFirstDay =
      date.getFullYear() === userData.lastPeriodStart.y &&
      date.getMonth() + 1 === userData.lastPeriodStart.m &&
      date.getDate() === userData.lastPeriodStart.d

    if (isFirstDay) {
      const tomorrow = new Date(date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowKey = formatDate(tomorrow)
      if (userData.dayData[tomorrowKey]?.period === true) {
        newLastPeriodStart = {
          y: tomorrow.getFullYear(),
          m: tomorrow.getMonth() + 1,
          d: tomorrow.getDate(),
        }
      } else {
        // 若明天無經期，基準日失效
        newLastPeriodStart = undefined
      }
    }
  }

  return {
    keysToUpdate,
    isPeriod,
    newLastPeriodStart,
    newCycleLen: !newLastPeriodStart && !isPeriod ? 28 : newCycleLen || userData.cycleLen,
    clearEntireCycle,
  }
}
