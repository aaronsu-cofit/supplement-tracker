import React from 'react'
import { generateCalendarGrid } from '../utils/utils'
import { UserData } from '../types'
import { dk, formatDate, getCalendarDateStatus } from '@vitera/utils'

interface CalendarProps {
  currentMonth: Date
  selectedDateKey: string
  userData: UserData
  onMonthChange: (date: Date) => void
  onDateSelect: (date: Date) => void
  inlineChild?: React.ReactNode
}

export const Calendar: React.FC<CalendarProps> = ({
  currentMonth,
  selectedDateKey,
  userData,
  onMonthChange,
  onDateSelect,
  inlineChild,
}) => {
  const y = currentMonth.getFullYear()
  const m = currentMonth.getMonth() + 1
  const allCells = generateCalendarGrid(y, m)

  const rows = []
  for (let i = 0; i < allCells.length; i += 7) {
    const row = allCells.slice(i, i + 7)
    const hasSelected = row.some((c) => c.type === 'real' && dk(y, m, c.d) === selectedDateKey)

    rows.push(
      <div key={i} className="cal-row">
        {row.map((cell, idx) => {
          if (cell.type === 'other') {
            return (
              <div key={idx} className="cc other">
                <span className="cc-num">{cell.d}</span>
              </div>
            )
          }

          const key = dk(y, m, cell.d)
          const isToday = formatDate(new Date()) === key
          const isSelected = selectedDateKey === key
          const log = userData.dayData[key]
          const date = cell.date!

          let cellCls = 'cc'
          if (log?.period) cellCls += ' period'
          if (isToday) cellCls += ' today-cell'
          if (isSelected) cellCls += ' sel-cell'
          if (date > new Date()) cellCls += ' future'

          // Use shared utility for PRD-based predictions
          cellCls += getCalendarDateStatus(
            date,
            userData.lastPeriodStart,
            userData.cycleLen,
            userData.periodDuration,
            userData.dayData,
            formatDate
          )

          return (
            <div
              key={idx}
              className={cellCls}
              onClick={() => date <= new Date() && onDateSelect(date)}
            >
              <span className="cc-today-lbl">今天</span>
              <span className="cc-num">{cell.d}</span>
              {log?.symptoms?.length || log?.pbacLogs?.length ? (
                <div className="cc-sym-dot" />
              ) : null}
            </div>
          )
        })}
      </div>
    )

    if (hasSelected && inlineChild) {
      rows.push(<React.Fragment key={`inline-${i}`}>{inlineChild}</React.Fragment>)
    }
  }

  return (
    <div className="cal-card">
      <div className="cal-hdr">
        <button className="cal-nav" onClick={() => onMonthChange(new Date(y, m - 2, 1))}>
          ‹
        </button>
        <div className="cal-month-lbl">
          {y}年 {m}月
        </div>
        <button className="cal-nav" onClick={() => onMonthChange(new Date(y, m, 1))}>
          ›
        </button>
      </div>
      <div className="cal-legend">
        <div className="leg-i">
          <div className="leg-dot leg-dot-pink" /> <div className="leg-t">經期</div>
        </div>
        <div className="leg-i">
          <div className="leg-dot leg-dot-pred" /> <div className="leg-t">預測</div>
        </div>
        <div className="leg-i">
          <div className="leg-dot leg-dot-ov-period" /> <div className="leg-t">易孕期</div>
        </div>
        <div className="leg-i">
          <div className="leg-dot leg-dot-ov-day" /> <div className="leg-t">排卵日</div>
        </div>
      </div>
      <div className="cal-wk">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
          <div key={w} className="cal-wk-lbl">
            {w}
          </div>
        ))}
      </div>
      {rows}
    </div>
  )
}
