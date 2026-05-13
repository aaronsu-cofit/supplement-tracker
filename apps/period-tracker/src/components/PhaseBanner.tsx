import React from 'react'

interface PhaseBannerProps {
  phase: string
  phaseDay: number
  phaseInfo: {
    bg: string
    border: string
    textC: string
    lblC: string
    chipBg: string
    chipC: string
  }
  dailyAdviceSummary: string
  onShowAdvice: () => void
  gridInfo?: {
    ovulationDate: Date
    nextPeriodDate: Date
    daysToNext: number
    lastPeriodStart: { y: number; m: number; d: number }
    periodDuration: number
  }
}

export const PhaseBanner: React.FC<PhaseBannerProps> = ({
  phase,
  phaseDay,
  phaseInfo,
  dailyAdviceSummary,
  onShowAdvice,
  gridInfo,
}) => {
  return (
    <div
      className="phase-banner"
      style={
        {
          '--phase-bg': phaseInfo.bg,
          '--phase-border': phaseInfo.border,
          '--phase-text': phaseInfo.textC,
          '--phase-lbl': phaseInfo.lblC,
        } as React.CSSProperties
      }
    >
      <div className="phase-banner-top">
        <div className="phase-banner-title">
          現在的你｜{phase}第{phaseDay}天
        </div>
        <div className="phase-banner-advice-btn" onClick={onShowAdvice}>
          <div className="phase-banner-advice-lbl">查看建議 →</div>
        </div>
      </div>
      <div className="phase-banner-desc" style={{ marginBottom: gridInfo ? '12px' : '0' }}>
        {dailyAdviceSummary}
      </div>

      {gridInfo && (
        <>
          <div className="phase-banner-divider"></div>
          <div className="phase-cycle-grid">
            {/* 排卵日 */}
            <div className="phase-cycle-item">
              <div className="phase-cycle-lbl">排卵日</div>
              <div className="phase-cycle-val">
                {gridInfo.ovulationDate.getMonth() + 1}月{gridInfo.ovulationDate.getDate()}日
              </div>
              <div className="phase-cycle-note">預測</div>
            </div>

            {/* 下次經期 */}
            <div className="phase-cycle-item">
              <div className="phase-cycle-lbl">下次經期</div>
              <div className="phase-cycle-val">
                {gridInfo.nextPeriodDate.getMonth() + 1}月{gridInfo.nextPeriodDate.getDate()}日
              </div>
              <div className="phase-cycle-note">還有 {Math.max(0, gridInfo.daysToNext)} 天</div>
            </div>

            {/* 本次經期 */}
            <div className="phase-cycle-item">
              <div className="phase-cycle-lbl">本次經期</div>
              <div className="phase-cycle-val">
                {gridInfo.lastPeriodStart.m}/{gridInfo.lastPeriodStart.d}
              </div>
              <div className="phase-cycle-note">持續 {gridInfo.periodDuration} 天</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
