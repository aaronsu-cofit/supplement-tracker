import React from 'react'

interface ExpertAdviceInlineProps {
  phaseInfo: {
    body: string
    fitness: string
    nutrition: string
  }
  onShowAdvice: () => void
}

export const ExpertAdviceInline: React.FC<ExpertAdviceInlineProps> = ({
  phaseInfo,
  onShowAdvice,
}) => {
  return (
    <div className="ai-inline" onClick={onShowAdvice} style={{ cursor: 'pointer' }}>
      <div className="ai-inline-ic">💡</div>
      <div className="ai-inline-body">
        <div className="ai-inline-lbl">專家建議</div>
        <div className="ai-inline-text">
          <b>身體：</b>
          {phaseInfo.body}
        </div>
        <div className="ai-inline-text">
          <b>運動：</b>
          {phaseInfo.fitness}
        </div>
        <div className="ai-inline-text">
          <b>營養：</b>
          {phaseInfo.nutrition}
        </div>
      </div>
    </div>
  )
}
