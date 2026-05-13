import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'
import { parseUTCDate, formatUTCDate } from '../lib/dateUtils.js'

/**
 * CycleService - 業務邏輯層
 * 責任：
 * - MenstrualCycle 和 DailyLog 的 CRUD 操作
 * - 週期設定和每日日誌管理
 * - 與數據庫交互
 */
export class CycleService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get user cycle data including settings and all daily logs
   */
  async getUserCycleData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        daily_logs: {
          orderBy: { date: 'asc' },
        },
        menstrual_cycle: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const dayData: Record<string, any> = {}
    user.daily_logs.forEach((log: any) => {
      const dateKey = formatUTCDate(log.date)
      dayData[dateKey] = log.data as any
    })

    const lastPeriod = await this.prisma.period.findFirst({
      where: { user_id: userId },
      orderBy: { start_date: 'desc' },
    })

    let lastPeriodStart = null
    if (lastPeriod) {
      const d = lastPeriod.start_date
      lastPeriodStart = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
    } else if (user.daily_logs.length > 0) {
      // Fallback: Find earliest log with period: true
      const periodLogs = user.daily_logs
        .filter((l: any) => (l.data as any).period === true)
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
      if (periodLogs.length > 0) {
        const d = periodLogs[0].date
        lastPeriodStart = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
      }
    }

    return {
      hasData: (user.menstrual_cycle as any)?.onboarding_done ?? false,
      lastPeriodStart,
      periodDuration: (user.menstrual_cycle as any)?.period_length || 5,
      cycleLen: (user.menstrual_cycle as any)?.cycle_length || 28,
      dayData,
    }
  }

  /**
   * Setup user cycle settings (Onboarding)
   */
  async setupCycle(userId: string, payload: any) {
    const { lastPeriodStart, periodDuration, cycleLen } = payload

    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Create or update menstrual cycle settings and mark as onboarded
      await tx.menstrualCycle.upsert({
        where: { user_id: userId },
        update: {
          period_length: periodDuration,
          cycle_length: cycleLen,
          onboarding_done: true,
        },
        create: {
          user_id: userId,
          period_length: periodDuration,
          cycle_length: cycleLen,
          onboarding_done: true,
        },
      })

      const startDate = parseUTCDate(
        `${lastPeriodStart.y}-${String(lastPeriodStart.m).padStart(2, '0')}-${String(lastPeriodStart.d).padStart(2, '0')}`
      )

      // 2. Create initial period record
      await tx.period.create({
        data: {
          user_id: userId,
          start_date: startDate,
          end_date: addDays(startDate, periodDuration - 1),
        },
      })

      // 3. Create initial period logs
      for (let i = 0; i < periodDuration; i++) {
        const currentDate = addDays(startDate, i)

        await tx.dailyLog.upsert({
          where: {
            uq_daily_logs_user_date: {
              user_id: userId,
              date: currentDate,
            },
          },
          update: {
            data: { period: true },
          },
          create: {
            user_id: userId,
            date: currentDate,
            data: { period: true },
          },
        })
      }

      return { success: true }
    })
  }

  /**
   * Save or update a daily log
   * 智能合併策略：
   * - 如果 period 為 false → 清除操作（直接蓋掉）
   * - 否則 → 追加/更新操作（字段存在則蓋掉，不存在則保留既有值）
   */
  async saveDailyLog(userId: string, payload: any): Promise<any> {
    const { date, data } = payload
    // 解析日期字符串為 UTC 日期（避免時區問題，適用於任何時區環境）
    const logDate = parseUTCDate(date)

    // 先查詢現有記錄
    const existingLog = await this.prisma.dailyLog.findFirst({
      where: {
        user_id: userId,
        date: logDate,
      },
    })

    // 智能合併：判斷是追加還是清除
    let mergedData = data as any
    if (existingLog) {
      const existing = existingLog.data as any
      const incomingData = data as any

      // 判斷是否為「清除」操作：只有當明確發送 period: false 時才認為是清除
      const isClearing = 'period' in incomingData && incomingData.period === false

      if (isClearing) {
        // 清除操作：直接使用傳入的數據（覆蓋）
        mergedData = {
          ...existing,
          ...incomingData,
        }
      } else {
        // 追加操作：智能合併
        mergedData = {
          ...existing,
          ...incomingData,
        }

        // pbacLogs、symptoms、emotions 的處理：
        // - 有發送 → 直接蓋掉（前端發什麼就是什麼）
        // - 未發送 → 保留既有
        if (!('pbacLogs' in incomingData)) {
          mergedData.pbacLogs = existing.pbacLogs || []
        }
        if (!('symptoms' in incomingData)) {
          mergedData.symptoms = existing.symptoms || []
        }
        if (!('emotions' in incomingData)) {
          mergedData.emotions = existing.emotions || []
        }
      }
    }

    const log = await this.prisma.dailyLog.upsert({
      where: {
        uq_daily_logs_user_date: {
          user_id: userId,
          date: logDate,
        },
      },
      update: {
        data: mergedData,
      },
      create: {
        user_id: userId,
        date: logDate,
        data: mergedData,
      },
    })

    return {
      id: log.id,
      userId: log.user_id,
      date: formatUTCDate(log.date),
      data: log.data as any,
      createdAt: log.created_at.toISOString(),
      updatedAt: log.updated_at.toISOString(),
    }
  }

  /**
   * Update user cycle settings
   * Handles:
   * - periodDuration, cycleLen: Update menstrual_cycle settings
   * - lastPeriodStart: If null, delete all periods (clearing entire cycle)
   */
  async updateCycleSettings(userId: string, payload: any) {
    const { periodDuration, cycleLen, lastPeriodStart } = payload

    return await this.prisma.$transaction(async (tx: any) => {
      // Update cycle settings
      await tx.menstrualCycle.update({
        where: { user_id: userId },
        data: {
          period_length: periodDuration,
          cycle_length: cycleLen,
        },
      })

      // If lastPeriodStart is null, delete all periods for this user
      // (This represents clearing all period records)
      if (lastPeriodStart === null) {
        await tx.period.deleteMany({
          where: { user_id: userId },
        })
      }

      return { success: true }
    })
  }
}
