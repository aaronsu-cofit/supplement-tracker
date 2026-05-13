import {
  addDaysToDate,
  createDateFromYMD,
  daysDifference,
  getDateOnly,
  getTodayNormalized,
} from './date'

/** 週期階段計算相關偏移量 (相對於下次經期開始) */
export const CYCLE_PHASE_OFFSETS = {
  /** 排卵期開始 (Day 9 in 28-day cycle) - PRD 定義：cyc - 19 */
  OVULATION_START: 19,
  /** 排卵期結束 (Day 15 in 28-day cycle) - PRD 定義：cyc - 13 */
  OVULATION_END: 13,
  /** 排卵日高峰 (Day 14 in 28-day cycle) - PRD: 排卵日 = 週期開始 + (週期長 - 14) 天 */
  OVULATION_PEAK: 14,
  /** 易孕期開始 (Day 9 in 28-day cycle) - PRD 定義：cyc - 19 */
  FERTILE_WINDOW_START: 19,
  /** 排卵階段天數計算基準 (Day 9 = cyc - 19) */
  OVULATION_DAY_BASE: 19,
  /** 黃體階段天數計算基準 (Day 16 = cyc - 12) */
  LUTEAL_DAY_BASE: 12,
}

/**
 * 根據在週期中的天數判定目前階段
 * @param actualDay - 週期第幾天 (1 ~ cycleLen)
 * @param cycleLen - 週期長度
 * @param periodDuration - 預設經期天數
 * @returns 階段名稱（經期、排卵期、黃體期、濾泡期）
 */
export const getPhaseForDay = (
  actualDay: number,
  cycleLen: number,
  periodDuration: number
): string => {
  if (actualDay <= periodDuration) return '經期'
  if (
    actualDay >= cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_START &&
    actualDay <= cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_END
  )
    return '排卵期'
  if (actualDay > cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_END) return '黃體期'
  return '濾泡期'
}

/**
 * 計算階段內的第幾天
 * @param phase - 階段名稱
 * @param actualDay - 週期第幾天
 * @param cycleLen - 週期長度
 * @param periodDuration - 預設經期天數
 * @returns 階段日 (1-based)
 */
export const getPhaseDay = (
  phase: string,
  actualDay: number,
  cycleLen: number,
  periodDuration: number
): number => {
  let phaseDay = 1
  if (phase === '經期') {
    phaseDay = actualDay
  } else if (phase === '濾泡期') {
    phaseDay = actualDay - periodDuration
  } else if (phase === '排卵期') {
    phaseDay = actualDay - (cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_DAY_BASE)
  } else if (phase === '黃體期') {
    phaseDay = actualDay - (cycleLen - CYCLE_PHASE_OFFSETS.LUTEAL_DAY_BASE)
  }
  return Math.max(1, phaseDay)
}

/**
 * 計算排卵日高峰日期
 * @param cycleStart - 週期開始日
 * @param cycleLen - 週期長度
 * @returns 排卵日 Date 對象
 */
export const getOvulationPeakDate = (cycleStart: Date, cycleLen: number): Date =>
  addDaysToDate(cycleStart, cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_PEAK)

/**
 * 計算易孕期開始日期 (包含排卵日前 6 天)
 * @param cycleStart - 週期開始日
 * @param cycleLen - 週期長度
 * @returns 易孕期開始日期 Date 對象
 */
export const getFertileWindowStartDate = (cycleStart: Date, cycleLen: number): Date => {
  const ovOffset = cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_PEAK
  const fsOffset =
    ovOffset - (CYCLE_PHASE_OFFSETS.FERTILE_WINDOW_START - CYCLE_PHASE_OFFSETS.OVULATION_PEAK)
  return addDaysToDate(cycleStart, fsOffset)
}

/**
 * 計算易孕期結束日期 (排卵日後 1 天，即第 15 天於 28 天週期)
 * @param cycleStart - 週期開始日
 * @param cycleLen - 週期長度
 * @returns 易孕期結束日期 Date 對象
 */
export const getFertileWindowEndDate = (cycleStart: Date, cycleLen: number): Date =>
  addDaysToDate(cycleStart, cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_END)

/**
 * 計算預測下次經期開始日期
 * @param cycleStart - 當前週期開始日
 * @param cycleLen - 週期長度
 * @returns 下次經期開始日期 Date 對象
 */
export const getNextPeriodStartDate = (cycleStart: Date, cycleLen: number): Date =>
  addDaysToDate(cycleStart, cycleLen)

/**
 * 計算預測下次經期結束日期
 * @param nextPeriodStart - 下次經期開始日
 * @param periodDuration - 經期天數
 * @returns 下次經期結束日期 Date 對象
 */
export const getNextPeriodEndDate = (nextPeriodStart: Date, periodDuration: number): Date =>
  addDaysToDate(nextPeriodStart, periodDuration - 1)

/**
 * 根據週期基準日預測特定週期的關鍵日期
 * 整合排卵、易孕期與經期預測
 * @param cycleStart - 該週期的起始日期
 * @param cycleLen - 週期長度
 * @param periodDuration - 經期天數
 * @returns 包含預測日期的對象 (ovDay, fsDay, feDay, npDay, npEndDay)
 */
export const predictCycleDates = (cycleStart: Date, cycleLen: number, periodDuration: number) => {
  const npDay = getNextPeriodStartDate(cycleStart, cycleLen)

  return {
    ovDay: getOvulationPeakDate(cycleStart, cycleLen),
    fsDay: getFertileWindowStartDate(cycleStart, cycleLen),
    feDay: getFertileWindowEndDate(cycleStart, cycleLen),
    npDay,
    npEndDay: getNextPeriodEndDate(npDay, periodDuration),
  }
}

/**
 * 計算特定日期在日曆檢視中的視覺狀態類別 (CSS Class Names)
 *
 * 此函式用於日曆渲染，會根據輸入日期預測其在生理週期中的地位，回傳對應的 CSS 類別名稱：
 * - ' ovulation-day': 預測排卵當日
 * - ' ovulation-period': 預測易孕期 (含排卵日)
 * - ' pred': 預測的下次經期區間
 *
 * 實作上會自動計算該日期落在哪一個週期循環中，並根據該週期的基準預測關鍵日期。
 *
 * @param date - 要判定的日期
 * @param lastPeriodStart - 初始基準日，用於推算所有後續週期
 * @param cycleLen - 平均週期長度
 * @param periodDuration - 預設經期天數
 * @returns {string} 樣式類別字串（以空格開頭，方便與其它類別拼接）
 */
export const getCalendarDateStatus = (
  date: Date,
  lastPeriodStart: { y: number; m: number; d: number } | null,
  cycleLen: number,
  periodDuration: number,
  dayData?: Record<string, unknown>,
  formatDateFn?: (date: Date) => string
): string => {
  if (!lastPeriodStart) return ''

  const ps = createDateFromYMD(lastPeriodStart.y, lastPeriodStart.m, lastPeriodStart.d)
  const diffDays = daysDifference(date, ps)

  if (diffDays < 0) return ''

  // 使用與 calculateCycleInfo 相同的邏輯：先尋找實際的新經期標記
  let currentCycleStart = ps
  let foundNewPeriodMark = false

  if (dayData && formatDateFn) {
    const nextPeriodPrediction = addDaysToDate(ps, cycleLen)
    const checkDate = new Date(nextPeriodPrediction)
    for (let i = 0; i < 30; i++) {
      const log = dayData[formatDateFn(checkDate)] as { period?: boolean } | undefined
      if (log?.period === true) {
        currentCycleStart = new Date(checkDate)
        foundNewPeriodMark = true
        break
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }
  }

  // 如果沒有找到新的經期標記，使用自動推進邏輯
  // 這樣每個月都能正確顯示排卵期和排卵日預測（像 Period_Tracking 一樣）
  if (!foundNewPeriodMark) {
    // 計算預測下次經期的結束日期（相對於初始周期開始）
    const nextPeriodEnd = cycleLen + periodDuration - 1

    // 如果日期在預測經期範圍內，保持使用初始周期
    // 否則，計算日期所在的下一個周期
    if (diffDays > nextPeriodEnd) {
      // 日期已經超過預測經期，計算它所在的周期
      const cyclesAfterInitialPeriod = Math.floor((diffDays - nextPeriodEnd - 1) / cycleLen) + 1
      const dayMillis = 24 * 60 * 60 * 1000
      currentCycleStart = new Date(ps.getTime() + cyclesAfterInitialPeriod * cycleLen * dayMillis)
    }
    // 否則保持 currentCycleStart = ps
  }

  // 基於找到的週期開始日期計算預測
  const p = predictCycleDates(currentCycleStart, cycleLen, periodDuration)

  const dOnly = getDateOnly(date)
  if (dOnly === getDateOnly(p.ovDay)) return ' ovulation-day'
  if (dOnly >= getDateOnly(p.fsDay) && dOnly <= getDateOnly(p.feDay)) return ' ovulation-period'
  if (dOnly === getDateOnly(p.npDay)) return ' pred'

  return ''
}

/**
 * 週期資訊對象
 */
export interface CycleInfo {
  /** 週期階段名稱 */
  phase: string
  /** 週期第幾天 */
  cycleDay: number
  /** 當前階段的第幾天 */
  phaseDay: number
  /** 距離下次經期的天數 */
  daysToNext: number
  /** 預測下次經期開始日期 */
  nextPeriodDate: Date
  /** 預測排卵日 */
  ovulationDate: Date
  /** 上次經期開始日期對象 */
  lastPeriodStart: { y: number; m: number; d: number }
  /** 設定的經期天數 */
  periodDuration: number
  /** 當前週期的 PBAC 總分 */
  pbacTotal: number
  /** 實際經期天數 */
  actualDuration: number
}

/**
 * 核心週期邏輯：計算並回傳當前週期的詳細資訊
 *
 * 此函式會根據使用者設定的基準日（lastPeriodStart）與平均週期長度（cycleLen），
 * 計算出使用者目前處於週期的哪一天、哪一個生理階段，並預測未來的排卵與下次經期日期。
 * 同時，它會遍歷當前週期的日誌資料，加總所有 PBAC 紀錄以計算總出血量分數。
 *
 * @param userData - 包含計算所需的關鍵使用者資料
 *   - lastPeriodStart: 週期基準日 (YYYY-MM-DD 物件)，若為 null 則無法計算
 *   - cycleLen: 平均週期天數 (例如 28)
 *   - periodDuration: 預設的經期天數 (例如 5)
 *   - dayData: 以日期字串為鍵的日誌紀錄映射表
 * @param getScore - PBAC 計分函式，用於將浸透程度與血塊類型轉換為數值分數
 * @param formatDate - 日期格式化函式，確保 userData.dayData 的鍵值匹配
 *
 * @returns {CycleInfo | null} 包含以下欄位的週期資訊物件：
 *   - phase: 目前階段文字 (經期、濾泡期、排卵期、黃體期)
 *   - cycleDay: 週期第幾天 (1-based)
 *   - phaseDay: 該階段的第幾天 (1-based)
 *   - daysToNext: 距離下次預測經期的天數 (負數表示已延遲)
 *   - nextPeriodDate: 預測的下次經期起始日
 *   - ovulationDate: 預測的排卵日
 *   - pbacTotal: 當前週期累積的 PBAC 總分
 *   若 lastPeriodStart 為空，則回傳 null。
 */
export const calculateCycleInfo = (
  userData: {
    lastPeriodStart: { y: number; m: number; d: number } | null
    cycleLen: number
    periodDuration: number
    dayData: Record<string, unknown>
  },
  getScore: (level: string, clot: string | undefined) => number,
  formatDate: (date: Date) => string
): CycleInfo | null => {
  if (!userData.lastPeriodStart) return null

  const { y, m, d } = userData.lastPeriodStart
  const start = createDateFromYMD(y, m, d)
  const today = getTodayNormalized()

  const cycleLen = userData.cycleLen

  // 不使用自動推進的週期，而是檢查是否有實際的經期標記
  // 如果在預測的下次經期開始日期前有新的經期標記，才使用那個新開始日期
  let currentCycleStart = start

  // 預測基於當前週期開始日期的下次經期日期
  let nextPeriodPrediction = addDaysToDate(start, cycleLen)

  // 掃描 dayData，尋找在 nextPeriodPrediction 之後的實際經期標記
  // 這表示用戶已經標記了新的經期開始
  const checkDate = new Date(nextPeriodPrediction)
  for (let i = 0; i < 30; i++) {
    // 掃描範圍：預測下次經期後的 30 天內
    const log = userData.dayData[formatDate(checkDate)] as { period?: boolean } | undefined
    if (log?.period === true) {
      // 找到了新的經期標記，更新週期開始日期
      currentCycleStart = new Date(checkDate)
      break
    }
    checkDate.setDate(checkDate.getDate() + 1)
  }

  // 重新計算 diffDays，基於實際找到的週期開始日期
  const adjustedDiffDays = daysDifference(today, currentCycleStart)
  const dayInCycle = (adjustedDiffDays % cycleLen) + 1
  const actualDay = dayInCycle > 0 ? dayInCycle : cycleLen + dayInCycle

  const phase = getPhaseForDay(actualDay, cycleLen, userData.periodDuration)
  const phaseDay = getPhaseDay(phase, actualDay, cycleLen, userData.periodDuration)

  const p = predictCycleDates(currentCycleStart, cycleLen, userData.periodDuration)

  let pbacTotal = 0
  for (let i = 0; i < userData.periodDuration + 7; i++) {
    const date = addDaysToDate(currentCycleStart, i)
    const key = formatDate(date)
    const log = userData.dayData[key] as
      | { pbacLogs?: { level: string; clot?: string }[] }
      | undefined
    if (log?.pbacLogs) {
      log.pbacLogs.forEach((l) => {
        pbacTotal += getScore(l.level, l.clot)
      })
    }
  }

  return {
    phase,
    cycleDay: actualDay,
    phaseDay,
    daysToNext: daysDifference(p.npDay, today),
    nextPeriodDate: p.npDay,
    ovulationDate: p.ovDay,
    lastPeriodStart: userData.lastPeriodStart,
    periodDuration: userData.periodDuration,
    pbacTotal,
    actualDuration: userData.periodDuration,
  }
}

/**
 * 每日狀態資訊對象
 */
export interface DayInfo {
  /** 是否為今天 */
  isToday: boolean
  /** 是否為未來日期 */
  isFuture: boolean
  /** 該日的日誌紀錄 */
  dayLog?: unknown
  /** 狀態顯示文字 */
  statusText: string
}

/**
 * 計算並回傳特定日期的顯示狀態資訊
 *
 * 此函式用於決定在 UI 上如何呈現某個特定日期，包含：
 * 1. 判定該日期是否為今天或未來日期。
 * 2. 從 dayData 中提取該日的原始日誌紀錄。
 * 3. 根據該日是否處於經期或普通週期天數，生成對應的狀態描述文字（例如「經期第 3 天」或「週期第 15 天」）。
 *
 * @param date - 要計算的目標日期
 * @param userData - 包含日誌與週期設定的使用者資料
 * @param cycleInfo - 預先計算好的週期概況（用於獲取當前週期的基準資訊）
 * @param formatDate - 用於匹配 dayData 鍵值的日期格式化函式
 *
 * @returns {DayInfo} 包含 isToday, isFuture, dayLog 與 statusText 的物件
 */
export const calculateDayInfo = (
  date: Date | null,
  userData: {
    lastPeriodStart: { y: number; m: number; d: number } | null
    cycleLen: number
    dayData: Record<string, unknown>
  },
  cycleInfo: CycleInfo | null,
  formatDate: (date: Date) => string
): DayInfo => {
  if (!date) return { isToday: false, isFuture: false, dayLog: undefined, statusText: '' }

  const dateKey = formatDate(date)
  const today = getTodayNormalized()
  const isToday = dateKey === formatDate(today)
  const isFuture = date.getTime() > today.getTime()
  const dayLog = userData.dayData[dateKey]

  let statusText = ''
  if (isFuture) {
    statusText = '未來日期'
  } else if (userData.lastPeriodStart) {
    const start = createDateFromYMD(
      userData.lastPeriodStart.y,
      userData.lastPeriodStart.m,
      userData.lastPeriodStart.d
    )
    const diff = daysDifference(date, start)
    const log = dayLog as { period?: boolean } | undefined

    if (log?.period) {
      statusText = diff >= 0 ? `經期第 ${diff + 1} 天` : '經期'
    } else if (cycleInfo) {
      const cd = (((diff % userData.cycleLen) + userData.cycleLen) % userData.cycleLen) + 1
      statusText = `週期第 ${cd} 天`
    }
  }

  return { isToday, isFuture, dayLog, statusText }
}
