/**
 * 共用日期工具函式
 */

import { format } from 'date-fns'

/** 1 天的毫秒數 */
export const MILLISECONDS_PER_DAY = 864e5

/**
 * 從年月日創建 Date 對象
 * @param y - 年份
 * @param m - 月份 (1-12)
 * @param d - 日期 (1-31)
 * @returns Date 對象
 */
export const createDateFromYMD = (y: number, m: number, d: number): Date => new Date(y, m - 1, d)

/**
 * 計算兩個日期之間的天數差
 * @param date1 - 第一個日期
 * @param date2 - 第二個日期
 * @returns 天數差（四捨五入）
 */
export const daysDifference = (date1: Date, date2: Date): number =>
  Math.round((date1.getTime() - date2.getTime()) / MILLISECONDS_PER_DAY)

/**
 * 在給定日期上增加指定天數
 * @param date - 基準日期
 * @param days - 要增加的天數 (可為負數)
 * @returns 新的日期對象
 */
export const addDaysToDate = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MILLISECONDS_PER_DAY)

/**
 * 獲取日期的天數整數值（從 1970-01-01 開始的天數）
 * 用於不考慮時分秒的日期比較
 * @param date - 目標日期
 * @returns 天數整數
 */
export const getDateOnly = (date: Date): number => Math.floor(date.getTime() / MILLISECONDS_PER_DAY)

/**
 * 獲取今天的標準化日期（時間設為 00:00:00）
 * @returns 今天的標準化 Date 對象
 */
export const getTodayNormalized = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * 日期標記組合器
 * 返回標準化的日期格式 YYYY-MM-DD（帶零填充）
 * @param y - 年份
 * @param m - 月份 (1-12)
 * @param d - 日期 (1-31)
 * @returns 格式為 YYYY-MM-DD 的字串
 */
export const dk = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/**
 * 將 Date 對象格式化為 YYYY-MM-DD 的字串（標準化格式，與後端一致）
 * @param date - Date 對象
 * @returns 格式化後的字串，例如 "2026-05-08"
 */
export const formatDate = (date: Date): string =>
  dk(date.getFullYear(), date.getMonth() + 1, date.getDate())

/**
 * 從 YYYY-MM-DD 格式字串解析為 UTC Date 對象
 * 確保時區無關，適合跨時區部署（如 GKE）
 * @param dateString - YYYY-MM-DD 格式的日期字串
 * @returns UTC Date 對象，時間設為 00:00:00 UTC
 * @example
 * parseUTCDate('2026-05-08') → Date object at 2026-05-08T00:00:00.000Z
 */
export const parseUTCDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/**
 * 將 Date 對象格式化為 YYYY-MM-DD 的字串（UTC 安全）
 * 使用 date-fns 確保時區無關的格式化
 * @param date - Date 對象
 * @returns 格式化後的字串，例如 "2026-05-08"
 * @example
 * formatUTCDate(new Date(Date.UTC(2026, 4, 8))) → "2026-05-08"
 */
export const formatUTCDate = (date: Date): string => format(date, 'yyyy-MM-dd')
