import {
  addDaysToDate,
  createDateFromYMD,
  daysDifference,
  getDateOnly,
  getTodayNormalized,
} from './date'

/**
 * 生理週期階段分布圖示 (變數化表示)
 *
 * Day 1           Day (cycleLen-14)         Day cycleLen
 * ┌─────┬───────────────────┼────────────────────────┐
 * │     │                   │                        │
 * │ 經期 │    濾泡期     │易孕期 │      黃體期           │
 * │     │              │      │                      │
 * └─────┴──────────────┴──────┴──────────────────────┘
 * 1 ~  PD   PD+1~FS-1  FS  ~  FE     FE+1~cycleLen
 *                           ▲
 *                       排卵日(OV)
 *
 * 變數說明：
 * ═══════════════════════════════════════════════════════
 * • cycleLen = 週期長度（如 21-45 天）
 * • PD = periodDuration（經期天數，如 3-7 天）
 * • OV = 排卵日 = cycleLen - 14
 * • FS = 易孕期開始 = cycleLen - 19
 * • FE = 易孕期結束 = cycleLen - 13
 *
 * 關鍵日期計算公式（根據 PRD 定義）：
 * ═══════════════════════════════════════════════════════
 * 排卵日     = 週期開始 + (cycleLen - 14) 天
 * 易孕期開始 = 週期開始 + (cycleLen - 19) 天
 * 易孕期結束 = 週期開始 + (cycleLen - 13) 天
 * 下次經期   = 週期開始 + cycleLen
 *
 * 倒數計算原理：
 * ───────────────────────────────────────────────────────
 * 醫學上從週期結束往前推算，確保各階段相對位置固定：
 * • 排卵日永遠在下次經期前 14 天
 * • 易孕期永遠在下次經期前 19-13 天
 * • 黃體期永遠維持約 14 天（排卵後到下次經期）
 */

/**
 * 週期階段計算相關偏移量常數（相對於下次經期開始）
 *
 * @description
 * 這些常數定義了生理週期中各個關鍵時期的偏移量，
 * 用於計算排卵日、易孕期等重要日期。
 * 所有數值都是基於醫學標準的倒數計算（從週期結束往前推算）。
 *
 * @example
 * ```typescript
 * // 計算 28 天週期的排卵日
 * const ovulationDay = cycleLength - CYCLE_PHASE_OFFSETS.OVULATION_PEAK; // 28 - 14 = 14
 * ```
 *
 * @constant
 */
export const CYCLE_PHASE_OFFSETS = {
  /** 易孕期開始 (Day 9 in 28-day cycle) - PRD 定義：cyc - 19 */
  OVULATION_START: 19,
  /** 易孕期結束 (Day 15 in 28-day cycle) - PRD 定義：cyc - 13 */
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
 * 階段判定邏輯圖示（變數化版本）
 *
 * actualDay 判定流程：
 * ════════════════════════════════════════════════════════
 *
 *     actualDay <= periodDuration ?  ───────► 經期
 *            │
 *            ▼ No
 *     actualDay >= (cycleLen-19) 且
 *     actualDay <= (cycleLen-13) ? ─────────► 易孕期
 *            │
 *            ▼ No
 *     actualDay > (cycleLen-13) ? ──────────► 黃體期
 *            │
 *            ▼ No
 *         濾泡期
 *
 * 變數對應關係：
 * ─────────────────────────────────────────────────
 * • periodDuration = 經期天數（如 3-7 天）
 * • cycleLen - 19  = 易孕期開始日
 * • cycleLen - 13  = 易孕期結束日
 *
 * 判定範例（cycleLen=28, periodDuration=5）：
 * ─────────────────────────────────────────────────
 * Day 1-5:   actualDay <= 5           → 經期
 * Day 6-8:   不符合其他條件            → 濾泡期
 * Day 9-15:  9 <= actualDay <= 15     → 易孕期
 * Day 16-28: actualDay > 15           → 黃體期
 */

/**
 * 根據在週期中的天數判定目前所處的生理階段
 *
 * @description
 * 根據當前是週期的第幾天，判斷使用者處於哪個生理階段。
 * 階段包括：經期、濾泡期、易孕期、黃體期。
 * 判斷優先順序為：經期 > 易孕期 > 黃體期 > 濾泡期。
 *
 * @param {number} actualDay - 週期的第幾天（1-based，範圍：1 ~ cycleLen）
 * @param {number} cycleLen - 完整週期長度（通常為 21-35 天）
 * @param {number} periodDuration - 預設經期持續天數（通常為 3-7 天）
 * @returns {string} 階段名稱：'經期' | '濾泡期' | '易孕期' | '黃體期'
 *
 * @example
 * ```typescript
 * // cycleLen=28, periodDuration=5, actualDay=14
 * const phase = getPhaseForDay(14, 28, 5); // 返回 '易孕期'
 *
 * // cycleLen=21, periodDuration=4, actualDay=7
 * const phase = getPhaseForDay(7, 21, 4); // 返回 '易孕期' (21-14=7)
 * ```
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
    return '易孕期'
  if (actualDay > cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_END) return '黃體期'
  return '濾泡期'
}

/**
 * 計算當前日期在特定生理階段內是第幾天
 *
 * @description
 * 根據所處的生理階段和週期天數，計算出在該階段內的相對天數。
 * 這對於顯示「經期第 3 天」或「易孕期第 2 天」等資訊很有用。
 *
 * @param {string} phase - 階段名稱（'經期' | '濾泡期' | '易孕期' | '黃體期'）
 * @param {number} actualDay - 當前是週期的第幾天（1-based）
 * @param {number} cycleLen - 完整週期長度
 * @param {number} periodDuration - 預設經期持續天數
 * @returns {number} 在該階段內的天數（1-based，最小值為 1）
 *
 * @example
 * ```typescript
 * // cycleLen=28, periodDuration=5, actualDay=12
 * // 易孕期範圍: Day 9-15 (28-19=9, 28-13=15)
 * const dayInPhase = getPhaseDay('易孕期', 12, 28, 5); // 返回 4
 *
 * // cycleLen=21, periodDuration=4, actualDay=5
 * // 易孕期範圍: Day 2-8 (21-19=2, 21-13=8)
 * const dayInPhase = getPhaseDay('易孕期', 5, 21, 4); // 返回 4
 * ```
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
  } else if (phase === '易孕期') {
    phaseDay = actualDay - (cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_DAY_BASE)
  } else if (phase === '黃體期') {
    phaseDay = actualDay - (cycleLen - CYCLE_PHASE_OFFSETS.LUTEAL_DAY_BASE)
  }
  return Math.max(1, phaseDay)
}

/**
 * 計算預測的排卵日日期
 *
 * @description
 * 根據醫學標準，排卵通常發生在下次月經前 14 天。
 * 此函式基於週期開始日期和週期長度，計算預測的排卵日。
 *
 * @param {Date} cycleStart - 週期開始日期（月經第一天）
 * @param {number} cycleLen - 週期長度（天數）
 * @returns {Date} 預測的排卵日日期
 *
 * @example
 * ```typescript
 * const cycleStart = new Date('2024-01-01');
 *
 * // cycleLen = 28：排卵日 = Day 14 (28-14)
 * const ov28 = getOvulationPeakDate(cycleStart, 28);
 * // 返回 2024-01-15
 *
 * // cycleLen = 21：排卵日 = Day 7 (21-14)
 * const ov21 = getOvulationPeakDate(cycleStart, 21);
 * // 返回 2024-01-08
 * ```
 */
export const getOvulationPeakDate = (cycleStart: Date, cycleLen: number): Date =>
  addDaysToDate(cycleStart, cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_PEAK)

/**
 * 計算易孕期開始日期
 *
 * @description
 * 易孕期（fertile window）是指最容易受孕的時期，
 * 通常從排卵日前 5 天開始，包括排卵日當天和排卵後 1 天。
 * 此函式計算易孕期的開始日期。
 *
 * @param {Date} cycleStart - 週期開始日期（月經第一天）
 * @param {number} cycleLen - 週期長度（天數）
 * @returns {Date} 易孕期開始日期
 *
 * @example
 * ```typescript
 * const cycleStart = new Date('2024-01-01');
 *
 * // cycleLen=28: 易孕期開始 = Day 9 (28-19)
 * const fs28 = getFertileWindowStartDate(cycleStart, 28);
 * // 返回 2024-01-10
 *
 * // cycleLen=35: 易孕期開始 = Day 16 (35-19)
 * const fs35 = getFertileWindowStartDate(cycleStart, 35);
 * // 返回 2024-01-17
 * ```
 */
export const getFertileWindowStartDate = (cycleStart: Date, cycleLen: number): Date => {
  const ovOffset = cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_PEAK
  const fsOffset =
    ovOffset - (CYCLE_PHASE_OFFSETS.FERTILE_WINDOW_START - CYCLE_PHASE_OFFSETS.OVULATION_PEAK)
  return addDaysToDate(cycleStart, fsOffset)
}

/**
 * 計算易孕期結束日期
 *
 * @description
 * 易孕期通常在排卵後 1 天結束，因為卵子的存活時間約為 24 小時。
 * 此函式計算易孕期的結束日期。
 *
 * @param {Date} cycleStart - 週期開始日期（月經第一天）
 * @param {number} cycleLen - 週期長度（天數）
 * @returns {Date} 易孕期結束日期
 *
 * @example
 * ```typescript
 * const cycleStart = new Date('2024-01-01');
 *
 * // cycleLen=28: 易孕期結束 = Day 15 (28-13)
 * const fe28 = getFertileWindowEndDate(cycleStart, 28);
 * // 返回 2024-01-16
 *
 * // cycleLen=21: 易孕期結束 = Day 8 (21-13)
 * const fe21 = getFertileWindowEndDate(cycleStart, 21);
 * // 返回 2024-01-09
 * ```
 */
export const getFertileWindowEndDate = (cycleStart: Date, cycleLen: number): Date =>
  addDaysToDate(cycleStart, cycleLen - CYCLE_PHASE_OFFSETS.OVULATION_END)

/**
 * 計算預測的下次經期開始日期
 *
 * @description
 * 基於當前週期的開始日期和平均週期長度，預測下一次月經的開始日期。
 *
 * @param {Date} cycleStart - 當前週期開始日期
 * @param {number} cycleLen - 平均週期長度（天數）
 * @returns {Date} 預測的下次經期開始日期
 *
 * @example
 * ```typescript
 * const currentStart = new Date('2024-01-01');
 * const nextPeriod = getNextPeriodStartDate(currentStart, 28);
 * // 返回 2024-01-29（28 天後）
 * ```
 */
export const getNextPeriodStartDate = (cycleStart: Date, cycleLen: number): Date =>
  addDaysToDate(cycleStart, cycleLen)

/**
 * 計算預測的下次經期結束日期
 *
 * @description
 * 根據預測的下次經期開始日期和平均經期持續天數，計算經期結束日期。
 *
 * @param {Date} nextPeriodStart - 下次經期開始日期
 * @param {number} periodDuration - 平均經期持續天數
 * @returns {Date} 預測的下次經期結束日期
 *
 * @example
 * ```typescript
 * const nextStart = new Date('2024-01-29');
 * const nextEnd = getNextPeriodEndDate(nextStart, 5);
 * // 返回 2024-02-02（經期第 5 天）
 * ```
 */
export const getNextPeriodEndDate = (nextPeriodStart: Date, periodDuration: number): Date =>
  addDaysToDate(nextPeriodStart, periodDuration - 1)

/**
 * 預測日期計算圖示（通用公式版本）
 *
 * 計算公式：
 * ═══════════════════════════════════════════════════════════
 * ┌──────────────────────────────────────────────────────┐
 * │ 排卵日 (ovDay):                                       │
 * │   = cycleStart + (cycleLen - 14)                     │
 * │   說明：排卵永遠在下次經期前 14 天                        │
 * ├──────────────────────────────────────────────────────┤
 * │ 易孕期開始 (fsDay):                                    │
 * │   = cycleStart + (cycleLen - 19)                     │
 * │   說明：排卵前 5 天開始易孕                              │
 * ├──────────────────────────────────────────────────────┤
 * │ 易孕期結束 (feDay):                                    │
 * │   = cycleStart + (cycleLen - 13)                     │
 * │   說明：排卵後 1 天結束易孕                              │
 * ├──────────────────────────────────────────────────────┤
 * │ 下次經期開始 (npDay):                                  │
 * │   = cycleStart + cycleLen                            │
 * │   說明：週期長度即為兩次經期的間隔                        │
 * ├──────────────────────────────────────────────────────┤
 * │ 下次經期結束 (npEndDay):                               │
 * │   = npDay + periodDuration - 1                       │
 * │   說明：經期持續 periodDuration 天                      │
 * └──────────────────────────────────────────────────────┘
 *
 * 動態時間軸視圖：
 * cycleStart          fsDay    ovDay    feDay          npDay
 * │───────────────────│────────│────────│──────────────│
 * ▼                   ▼        ▼        ▼              ▼
 * 週期開始            易孕開始  排卵日   易孕結束       下次經期
 *
 * 不同週期長度範例：
 * ─────────────────────────────────────────────────────
 * cycleLen=21: 排卵日=Day 7,  易孕期=Day 2-8
 * cycleLen=28: 排卵日=Day 14, 易孕期=Day 9-15
 * cycleLen=35: 排卵日=Day 21, 易孕期=Day 16-22
 */

/**
 * 根據週期基準日預測特定週期的所有關鍵日期
 *
 * @description
 * 這是一個整合函式，一次計算出週期內所有重要的預測日期，
 * 包括排卵日、易孕期範圍、下次經期等。
 *
 * @param {Date} cycleStart - 該週期的起始日期（月經第一天）
 * @param {number} cycleLen - 週期長度（天數）
 * @param {number} periodDuration - 經期持續天數
 * @returns {Object} 包含所有預測日期的物件
 * @returns {Date} returns.ovDay - 預測的排卵日
 * @returns {Date} returns.fsDay - 易孕期開始日期
 * @returns {Date} returns.feDay - 易孕期結束日期
 * @returns {Date} returns.npDay - 下次經期開始日期
 * @returns {Date} returns.npEndDay - 下次經期結束日期
 *
 * @example
 * ```typescript
 * const start = new Date('2024-01-01');
 *
 * // cycleLen=28, periodDuration=5
 * const pred28 = predictCycleDates(start, 28, 5);
 * // {
 * //   ovDay: Date('2024-01-15'),     // Day 14 (28-14)
 * //   fsDay: Date('2024-01-10'),     // Day 9 (28-19)
 * //   feDay: Date('2024-01-16'),     // Day 15 (28-13)
 * //   npDay: Date('2024-01-29'),     // Day 28
 * //   npEndDay: Date('2024-02-02')   // 經期 5 天
 * // }
 *
 * // cycleLen=21, periodDuration=3
 * const pred21 = predictCycleDates(start, 21, 3);
 * // {
 * //   ovDay: Date('2024-01-08'),     // Day 7 (21-14)
 * //   fsDay: Date('2024-01-03'),     // Day 2 (21-19)
 * //   feDay: Date('2024-01-09'),     // Day 8 (21-13)
 * //   npDay: Date('2024-01-22'),     // Day 21
 * //   npEndDay: Date('2024-01-24')   // 經期 3 天
 * // }
 * ```
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
 * 計算特定日期在日曆檢視中的視覺狀態類別
 *
 * @description
 * 此函式用於日曆渲染，根據日期在生理週期中的位置，
 * 返回對應的 CSS 類別名稱，用於視覺化顯示不同的週期狀態。
 *
 * 返回的 CSS 類別（以空格開頭，方便與其他類別拼接）：
 * - `' ovulation-day'` - 預測的排卵日
 * - `' ovulation-period'` - 易孕期範圍（含排卵日）
 * - `' pred'` - 預測的下次經期開始日
 * - `''` - 無特殊狀態
 *
 * @param {Date} date - 要判定狀態的日期
 * @param {Object|null} lastPeriodStart - 最後一次經期開始日期
 * @param {number} lastPeriodStart.y - 年份
 * @param {number} lastPeriodStart.m - 月份
 * @param {number} lastPeriodStart.d - 日期
 * @param {number} cycleLen - 平均週期長度（天數）
 * @param {number} periodDuration - 預設經期持續天數
 * @param {Record<string, unknown>} [dayData] - 日期資料對應表（可選）
 * @param {Function} [formatDateFn] - 日期格式化函式（可選）
 * @returns {string} CSS 類別字串（以空格開頭）
 *
 * @example
 * ```typescript
 * const status = getCalendarDateStatus(
 *   new Date('2024-01-15'),
 *   { y: 2024, m: 1, d: 1 },
 *   28,
 *   5
 * );
 * // 返回 ' ovulation-day'（如果該日是排卵日）
 * ```
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
  // 這樣每個月都能正確顯示易孕期和排卵日預測（像 Period_Tracking 一樣）
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
 * 週期資訊對象介面
 *
 * @description
 * 包含使用者當前生理週期的完整資訊，
 * 包括所處階段、預測日期、PBAC 評分等。
 *
 * @interface CycleInfo
 */
export interface CycleInfo {
  /** 當前所處的週期階段名稱（'經期' | '濾泡期' | '易孕期' | '黃體期'） */
  phase: string
  /** 當前是週期的第幾天（1-based） */
  cycleDay: number
  /** 在當前階段內是第幾天（1-based） */
  phaseDay: number
  /** 距離下次經期的天數（負數表示已延遲） */
  daysToNext: number
  /** 預測的下次經期開始日期 */
  nextPeriodDate: Date
  /** 預測的排卵日日期 */
  ovulationDate: Date
  /** 上次經期開始日期（年月日格式） */
  lastPeriodStart: { y: number; m: number; d: number }
  /** 設定的預設經期持續天數 */
  periodDuration: number
  /** 當前週期累積的 PBAC 總分（用於評估經血量） */
  pbacTotal: number
  /** 實際經期持續天數 */
  actualDuration: number
}

/**
 * 週期追蹤與 PBAC 計算流程圖
 *
 * ┌─────────────────────┐
 * │  初始基準日期         │
 * │  (lastPeriodStart)  │
 * └──────────┬──────────┘
 *           ▼
 * ┌─────────────────────┐
 * │ 計算預測下次經期       │
 * │ = 基準日 + cycleLen  │
 * └──────────┬──────────┘
 *           ▼
 * ┌─────────────────────┐     有新經期標記
 * │ 掃描未來 30 天        │ ─────────────────┐
 * │ 尋找新經期標記        │                  ▼
 * └──────────┬──────────┘        ┌──────────────┐
 *           │                    │ 更新基準日期   │
 *           │ 無新標記            │ 為新經期開始   │
 *           ▼                    └──────┬───────┘
 * ┌─────────────────────┐              │
 * │ 保持原基準日期        │◄─────────────┘
 * └──────────┬──────────┘
 *           ▼
 * ┌─────────────────────────────────┐
 * │ 計算當前週期資訊                   │
 * │ • cycleDay (週期第幾天)           │
 * │ • phase (所處階段)                │
 * │ • 預測日期 (排卵、易孕、下次經期).   │
 * └──────────┬──────────────────────┘
 *           ▼
 * ┌─────────────────────────────────┐
 * │ 累計 PBAC 總分                   │
 * │ 遍歷 periodDuration + 7 天       │
 * └─────────────────────────────────┘
 *
 * PBAC 評分規則（根據 PRD 3.1）：
 * ═══════════════════════════════════
 * 出血量：輕微 +1 | 中度 +5 | 重度 +20
 * 血塊：  無 +0 | 碎果凍 +1 | 燒仙草 +5
 *
 * 總分解讀（週期累計）：
 * ─────────────────────────────────────
 *   < 60 分：正常範圍
 *   60-99 分：接近警戒線，持續觀察
 *   ≥ 100 分：建議就醫（失血量 > 80ml）
 */

/**
 * 核心週期邏輯：計算並回傳當前週期的詳細資訊
 *
 * @description
 * 這是週期追蹤系統的核心函式。根據使用者的基準日期和週期參數，
 * 計算出當前所處的生理階段、預測未來的關鍵日期，
 * 並統計 PBAC（Pictorial Blood Assessment Chart）評分。
 *
 * 函式會智慧檢測新週期的開始（掃描未來 30 天內的經期標記），
 * 並自動調整計算基準，確保預測的準確性。
 *
 * @param {Object} userData - 使用者資料物件
 * @param {Object|null} userData.lastPeriodStart - 最後一次經期開始日期
 * @param {number} userData.lastPeriodStart.y - 年份
 * @param {number} userData.lastPeriodStart.m - 月份（1-12）
 * @param {number} userData.lastPeriodStart.d - 日期（1-31）
 * @param {number} userData.cycleLen - 平均週期長度（通常為 21-35 天）
 * @param {number} userData.periodDuration - 預設經期持續天數（通常為 3-7 天）
 * @param {Record<string, unknown>} userData.dayData - 以日期為鍵的日誌資料
 * @param {Function} getScore - PBAC 評分計算函式
 * @param {string} getScore.level - 出血量等級（'輕微'|'中度'|'重度'）
 * @param {string|undefined} getScore.clot - 血塊類型（可選）
 * @param {Function} formatDate - 日期格式化函式，用於匹配 dayData 的鍵
 * @returns {CycleInfo|null} 週期資訊物件，如果無基準日期則返回 null
 *
 * @example
 * ```typescript
 * const userData = {
 *   lastPeriodStart: { y: 2024, m: 1, d: 1 },
 *   cycleLen: 28,
 *   periodDuration: 5,
 *   dayData: { '2024-01-01': { period: true } }
 * };
 *
 * const cycleInfo = calculateCycleInfo(
 *   userData,
 *   (level, clot) => calculatePBACScore(level, clot),
 *   (date) => formatDateString(date)
 * );
 *
 * if (cycleInfo) {
 *   console.log(`當前階段：${cycleInfo.phase}`);
 *   console.log(`週期第 ${cycleInfo.cycleDay} 天`);
 *   console.log(`PBAC 總分：${cycleInfo.pbacTotal}`);
 * }
 * ```
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
 * 每日狀態資訊對象介面
 *
 * @description
 * 包含特定日期的狀態資訊，用於日曆視圖的渲染和互動。
 *
 * @interface DayInfo
 */
export interface DayInfo {
  /** 是否為今天 */
  isToday: boolean
  /** 是否為未來日期（未來日期通常不允許編輯） */
  isFuture: boolean
  /** 該日的日誌紀錄資料（可能包含經期標記、PBAC 記錄等） */
  dayLog?: unknown
  /** 狀態顯示文字（如「經期第 3 天」、「週期第 15 天」等） */
  statusText: string
}

/**
 * 計算並回傳特定日期的顯示狀態資訊
 *
 * @description
 * 此函式用於決定在 UI 上如何呈現某個特定日期。
 * 它會判斷日期的類型（今天/未來/過去），提取該日的日誌資料，
 * 並生成適當的狀態描述文字。
 *
 * 功能包括：
 * 1. 判定該日期是否為今天或未來日期
 * 2. 從 dayData 中提取該日的日誌紀錄
 * 3. 生成狀態描述文字（如「經期第 3 天」或「週期第 15 天」）
 *
 * @param {Date|null} date - 要計算狀態的目標日期
 * @param {Object} userData - 使用者資料物件
 * @param {Object|null} userData.lastPeriodStart - 最後一次經期開始日期
 * @param {number} userData.lastPeriodStart.y - 年份
 * @param {number} userData.lastPeriodStart.m - 月份
 * @param {number} userData.lastPeriodStart.d - 日期
 * @param {number} userData.cycleLen - 平均週期長度
 * @param {Record<string, unknown>} userData.dayData - 日誌資料對應表
 * @param {CycleInfo|null} cycleInfo - 預先計算的週期資訊（可用於獲取額外資訊）
 * @param {Function} formatDate - 日期格式化函式
 * @returns {DayInfo} 包含日期狀態資訊的物件
 *
 * @example
 * ```typescript
 * const dayInfo = calculateDayInfo(
 *   new Date('2024-01-03'),
 *   userData,
 *   cycleInfo,
 *   (date) => formatDateString(date)
 * );
 *
 * if (dayInfo.isToday) {
 *   console.log('這是今天');
 * }
 * if (dayInfo.dayLog) {
 *   console.log('這天有日誌紀錄');
 * }
 * console.log(dayInfo.statusText); // "經期第 3 天" 或 "週期第 15 天"
 * ```
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
