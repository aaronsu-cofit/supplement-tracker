import React from 'react'
import { InfoIcon } from './InfoIcon'

interface PbacSummaryRowProps {
  logsCount: number
  dayScore: number
  liveCycleScore: number
  scoreClass: string
  onShowInfo?: () => void
}

export const PbacSummaryRow: React.FC<PbacSummaryRowProps> = ({
  logsCount,
  dayScore,
  liveCycleScore,
  scoreClass,
  onShowInfo,
}) => {
  return (
    <div className="pbac-summary-row">
      <div className="pbac-summary-left">
        今日 {logsCount} 筆・<b>{dayScore} 分</b>
      </div>
      <div className="pbac-summary-right">
        本次經期累計：
        <b className={scoreClass}>{liveCycleScore}</b> 分
        <span className="pbac-info-icon" onClick={onShowInfo}>
          <InfoIcon />
        </span>
      </div>
    </div>
  )
}
