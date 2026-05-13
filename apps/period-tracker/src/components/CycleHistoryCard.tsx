import React, { useState } from 'react'
import { CLOT_TYPES } from '@repo/utils'
import { CycleHistory } from '../types'
import { TestTube } from './TestTube'
import { PbacColorClotModal } from './PbacColorClotModal'

export const CycleHistoryCard: React.FC<{ cycle: CycleHistory }> = ({ cycle }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showColorClotModal, setShowColorClotModal] = useState(false)
  const ptColor = cycle.pbacTotal >= 100 ? '#A32D2D' : cycle.pbacTotal >= 60 ? '#854F0B' : '#3B6D11'
  const ptBg = cycle.pbacTotal >= 100 ? '#FCEBEB' : cycle.pbacTotal >= 60 ? '#FAEEDA' : '#EAF3DE'

  return (
    <div className="history-card-wrap">
      <div className="history-card-main" onClick={() => setIsOpen(!isOpen)}>
        <div className="history-card-info">
          <div className="h-card-dates">
            {cycle.start} – {cycle.end}
            {cycle.cur ? '（預期）' : ''}
          </div>
          <div className="h-card-dur">
            持續 {cycle.days} 天{cycle.cycleLength && ` · 週期 ${cycle.cycleLength} 天`}
          </div>
        </div>
        <div className="h-card-badges">
          <span className="h-badge-pbac" style={{ background: ptBg, color: ptColor }}>
            經血量分數 {cycle.pbacTotal}
          </span>
          <span className={`h-badge-status ${cycle.cur ? 'current' : ''}`}>
            {cycle.cur ? '本次' : '已結束'}
          </span>
          <span className="h-card-arr"> {isOpen ? '收起 ▲' : '查看 ▼'}</span>
        </div>
      </div>
      {isOpen && (
        <div className="history-card-detail">
          <div className="h-detail-section">
            <div className="h-section-ttl">經血量變化</div>
            <div className="h-pbac-bars">
              {cycle.pbacDays.map((d, idx) => {
                const maxScore = Math.max(...cycle.pbacDays.map((x) => x.score)) || 1
                const pct = Math.round((d.score / maxScore) * 100)
                const barColor = d.score >= 20 ? '#E24B4A' : d.score >= 10 ? '#EF9F27' : '#FF6B81'
                return (
                  <div key={idx} className="h-pbac-col">
                    <div className="h-pbac-score">{d.score}</div>
                    <div className="h-pbac-track">
                      <div
                        className="h-pbac-fill"
                        style={{
                          height: `${pct}%`,
                          background: barColor,
                          minHeight: d.score > 0 ? '3px' : '0',
                        }}
                      />
                    </div>
                    <div className="h-pbac-label">第{d.day}天</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-detail-section">
            <div className="h-detail-header">
              <div className="h-section-ttl h-section-ttl-no-mb">經血量顏色和血塊</div>
              <span className="h-info-icon" onClick={() => setShowColorClotModal(true)}>
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
              </span>
            </div>
            <div className="h-tubes">
              {cycle.pbacDays.map((d, idx) => {
                const clot = CLOT_TYPES.find((c) => c.id === d.clot)
                const clotColor =
                  d.clot === 'large' ? '#A32D2D' : d.clot === 'small' ? 'var(--t2)' : 'var(--t3)'
                return (
                  <div key={idx} className="h-tube-item">
                    <TestTube colors={d.colors} />
                    <div className="h-tube-day">第{idx + 1}天</div>
                    <div
                      className="h-tube-clot"
                      style={{ color: clotColor, fontWeight: d.clot !== 'none' ? '600' : '400' }}
                    >
                      {clot?.label || '無血塊'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-detail-section">
            <div className="h-section-ttl">症狀</div>
            <div className="h-chips">
              {cycle.symptoms?.length > 0 ? (
                cycle.symptoms.map((s: string) => (
                  <span key={s} className="h-chip sym">
                    {s}
                  </span>
                ))
              ) : (
                <span className="empty-record-text">無記錄</span>
              )}
            </div>
          </div>

          <div className="h-detail-section">
            <div className="h-section-ttl">情緒</div>
            <div className="h-chips">
              {cycle.emotions?.length > 0 ? (
                cycle.emotions.map((e: string) => (
                  <span key={e} className="h-chip emo">
                    {e}
                  </span>
                ))
              ) : (
                <span className="empty-record-text">無記錄</span>
              )}
            </div>
          </div>
        </div>
      )}
      <PbacColorClotModal
        isOpen={showColorClotModal}
        onClose={() => setShowColorClotModal(false)}
      />
    </div>
  )
}
