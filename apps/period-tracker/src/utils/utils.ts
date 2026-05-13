/**
 * 獲取指定月份的天數
 */
export const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

/**
 * 獲取指定月份第一天是星期幾
 */
export const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay()

/**
 * 日曆儲存格資料結構
 */
export interface CalendarCell {
  d: number
  type: 'real' | 'other'
  date?: Date
}

/**
 * 生成日曆網格數據
 */
export const generateCalendarGrid = (y: number, m: number): CalendarCell[] => {
  const firstDay = getFirstDayOfMonth(y, m)
  const daysInMonth = getDaysInMonth(y, m)
  const prevDaysInMonth = getDaysInMonth(y, m - 1)

  const cells: CalendarCell[] = []

  for (let i = 0; i < firstDay; i++) {
    cells.push({
      d: prevDaysInMonth - firstDay + i + 1,
      type: 'other',
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      d,
      type: 'real',
      date: new Date(y, m - 1, d),
    })
  }

  const remaining = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      d: i,
      type: 'other',
    })
  }

  return cells
}
