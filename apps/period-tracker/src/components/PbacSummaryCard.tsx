import React from 'react'
import { getPbacStatusConfig } from '../utils/pbacStatus'

interface PbacSummaryCardProps {
  pbacTotal: number
  cycleDay: number
  onShowPbacOverlay: () => void
  onShowInfo: () => void
}

export const PbacSummaryCard: React.FC<PbacSummaryCardProps> = ({
  pbacTotal,
  cycleDay,
  onShowPbacOverlay,
  onShowInfo,
}) => {
  const pbacPct = Math.min(100, Math.round((pbacTotal / 100) * 100))
  const estimatedVolume = Math.round(pbacTotal * 0.8)
  const statusConfig = getPbacStatusConfig(pbacTotal, cycleDay)
  return (
    <div className="pbac-bar-card">
      <div className="pbac-bar-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="pbac-bar-title">經血量分數</div>
          <div
            onClick={onShowInfo}
            style={{
              cursor: 'pointer',
              color: 'var(--t3)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              margin: '-4px',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="pbac-bar-nums">
            <div className="pbac-bar-score" style={{ color: statusConfig.numberColor }}>
              {pbacTotal}
            </div>
            <div className="pbac-bar-limit">/ 100</div>
          </div>
          <button onClick={onShowPbacOverlay} className="pbac-bar-quick-btn">
            + 記錄
          </button>
        </div>
      </div>

      <div className="pbac-bar-est">預估經血量：{estimatedVolume}ml</div>

      <div className="pbac-bar-track">
        <div
          className="pbac-bar-fill"
          style={{
            width: `${pbacPct}%`,
            background: statusConfig.primaryColor,
          }}
        ></div>
      </div>

      {statusConfig.showStatus && (
        <div className="pbac-bar-status" style={{ background: statusConfig.backgroundColor }}>
          <div
            className="pbac-bar-status-dot"
            style={{ background: statusConfig.primaryColor }}
          ></div>
          <span style={{ color: statusConfig.textColor }}>{statusConfig.message}</span>
        </div>
      )}
    </div>
  )
}
