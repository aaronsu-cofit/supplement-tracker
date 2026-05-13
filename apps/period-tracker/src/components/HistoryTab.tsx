import React, { useState, useEffect } from 'react'
import { UserData, CycleHistory } from '../types'
import { apiClient } from '../api/client'
import { CycleHistoryCard } from './CycleHistoryCard'
import { buildAllCycleHistory } from '../utils/cycleHistory'

interface HistoryTabProps {
  userData: UserData
  cycleInfo: {
    nextPeriodDate: Date | null
    daysToNext: number
    actualDuration: number
  } | null
  /** 當 HistoryTab 被激活時傳入此標誌，用於重新刷新數據 */
  isActive?: boolean
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ userData, isActive }) => {
  const [historyData, setHistoryData] = useState<CycleHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 從後端 API 取得完整的用戶數據（包含所有 dayData）
        const cycleData = await apiClient.getCycleData()
        const dayData = cycleData.dayData || userData.dayData

        // 使用 utils 函數構建所有週期歷史
        const cycles = buildAllCycleHistory(dayData)
        setHistoryData(cycles)
      } catch (err) {
        console.error('Failed to fetch history data:', err)
        // 如果 API 失敗，使用本地數據
        const cycles = buildAllCycleHistory(userData.dayData)
        setHistoryData(cycles)
        setError('無法從伺服器載入數據，顯示本地數據')
      } finally {
        setIsLoading(false)
      }
    }

    // 當 tab 被激活時重新獲取數據
    if (isActive) {
      fetchHistoryData()
    }
  }, [userData, isActive])

  if (isLoading) {
    return (
      <div className="history-scroll">
        <div className="history-empty-state">加載中...</div>
      </div>
    )
  }

  if (historyData.length === 0) {
    return (
      <div className="history-scroll">
        <div className="history-empty-state">暫無紀錄</div>
      </div>
    )
  }

  return (
    <div className="history-scroll">
      {error && <div className="history-error-banner">{error}</div>}
      <div className="history-list">
        {historyData.map((c, i) => (
          <CycleHistoryCard key={i} cycle={c} />
        ))}
      </div>
    </div>
  )
}
