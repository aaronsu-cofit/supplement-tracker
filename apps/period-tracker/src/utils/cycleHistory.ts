import { CycleHistory, DayLog, PbacLog } from '../types'
import { MILLISECONDS_PER_DAY, CLOT_TYPES } from '@repo/utils'

/**
 * 從 dayData 中提取所有標記為 period=true 的日期
 */
export function extractPeriodDates(
  dayData: Record<string, DayLog>
): Array<{ date: Date; key: string }> {
  return Object.entries(dayData)
    .filter(([_, log]) => log.period === true)
    .map(([dateKey]) => {
      const [y, m, d] = dateKey.split('-').map(Number)
      return { date: new Date(y, m - 1, d), key: dateKey }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * 根據連續日期分組成週期
 * 如果日期間隔 = 1 天，認為是連續的同一週期
 * 如果日期間隔 > 1 天，認為是新的週期開始
 */
export function groupPeriodDatesByCycles(
  periodDates: Array<{ date: Date; key: string }>
): Array<{ startDate: Date; dayCount: number }> {
  if (periodDates.length === 0) return []

  const cycles: Array<{ startDate: Date; dayCount: number }> = []
  let currentCycleStart = periodDates[0]
  let currentCycleDays = [periodDates[0]]

  for (let i = 1; i < periodDates.length; i++) {
    const entry = periodDates[i]
    const lastDay = currentCycleDays[currentCycleDays.length - 1]
    const daysDiff = Math.round(
      (entry.date.getTime() - lastDay.date.getTime()) / MILLISECONDS_PER_DAY
    )

    if (daysDiff === 1) {
      // 連續，添加到當前週期
      currentCycleDays.push(entry)
    } else {
      // 不連續，結束當前週期，開始新週期
      cycles.push({
        startDate: currentCycleStart.date,
        dayCount: currentCycleDays.length,
      })
      currentCycleStart = entry
      currentCycleDays = [entry]
    }
  }

  // 添加最後一個週期
  cycles.push({
    startDate: currentCycleStart.date,
    dayCount: currentCycleDays.length,
  })

  return cycles
}

/**
 * 根據實際標記的連續 period 日期構建週期歷史
 */
export function buildCycleHistoryFromActualDates(
  startDate: Date,
  actualPeriodDuration: number,
  dayData: Record<string, DayLog>
): CycleHistory {
  const pbacDays: any[] = []
  const symptomsSet = new Set<string>()
  const emotionsSet = new Set<string>()

  // 遍歷實際標記的經期天數
  for (let dayIdx = 0; dayIdx < actualPeriodDuration; dayIdx++) {
    const dayDate = new Date(startDate.getTime() + dayIdx * MILLISECONDS_PER_DAY)
    const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`
    const dayLog = dayData[dateKey] || {}

    let dayScore = 0
    const colors: string[] = []
    let mainClot = 'none'

    // 計算該天的經血量評估總分
    if (dayLog.pbacLogs) {
      dayLog.pbacLogs.forEach((log: PbacLog) => {
        const lvScore = log.level === 'light' ? 1 : log.level === 'medium' ? 5 : 20
        let clotScore = 0
        if (log.clot && log.clot !== 'none') {
          const ct = CLOT_TYPES.find((c) => c.id === log.clot)
          clotScore = ct ? ct.score : 0
          if (log.clot === 'large') mainClot = 'large'
          else if (log.clot === 'small' && mainClot !== 'large') mainClot = 'small'
        }
        dayScore += lvScore + clotScore
        if (log.color) colors.push(log.color)
      })
    }

    // 收集症狀和情緒
    if (dayLog.symptoms) {
      dayLog.symptoms.forEach((s: string) => {
        if (s !== '無' && s !== '') symptomsSet.add(s)
      })
    }
    if (dayLog.emotions) {
      dayLog.emotions.forEach((e: string) => {
        if (e !== '') emotionsSet.add(e)
      })
    }

    pbacDays.push({
      day: dayIdx + 1,
      score: dayScore,
      colors: colors.length > 0 ? colors : ['pink'],
      clot: mainClot,
    })
  }

  const bloodScoreTotal = pbacDays.reduce((sum, d) => sum + d.score, 0)
  const endDate = new Date(startDate.getTime() + (actualPeriodDuration - 1) * MILLISECONDS_PER_DAY)

  return {
    start: `${startDate.getMonth() + 1}月${startDate.getDate()}日`,
    end: `${endDate.getMonth() + 1}月${endDate.getDate()}日`,
    days: actualPeriodDuration,
    cycleLength: actualPeriodDuration, // 實際週期長度 = 實際經期天數（因為我們只追蹤經期）
    cur: false, // 歷史週期都是過去的
    pbacTotal: bloodScoreTotal,
    pbacDays,
    symptoms: Array.from(symptomsSet),
    emotions: Array.from(emotionsSet),
  }
}

/**
 * 從 dayData 構建所有週期的歷史記錄
 * 按從新到舊的順序返回
 */
export function buildAllCycleHistory(dayData: Record<string, DayLog>): CycleHistory[] {
  const periodDates = extractPeriodDates(dayData)
  if (periodDates.length === 0) return []

  const cycles = groupPeriodDatesByCycles(periodDates)
  const histories = cycles.map((cycle) =>
    buildCycleHistoryFromActualDates(cycle.startDate, cycle.dayCount, dayData)
  )

  // 反轉順序，使最新的週期在前
  return histories.reverse()
}
