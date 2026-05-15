import React from 'react'
import { PHASE_HINTS, MENSTRUATION_DAILY, FOLLICULAR_DAILY, FERTILE_WINDOW_DAILY, LUTEAL_DAILY } from '../constants'

const ADVICE_ICONS = {
  energy: (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <path d="M12 2L3 13h8v9l9-11h-8V2Z" fill="#FF6B81" />
    </svg>
  ),
  body: (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="6" r="2.5" fill="#FF6B81" />
      <rect x="10.5" y="8" width="3" height="8" rx="1.5" fill="#FFB3C1" />
      <circle cx="12" cy="19" r="2.5" fill="#FF6B81" />
    </svg>
  ),
  mood: (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="10" r="8" fill="#FFF5E1" stroke="#FDB462" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.5" fill="#2C3E50" />
      <circle cx="15" cy="9" r="1.5" fill="#2C3E50" />
      <path
        d="M9 13Q12 15 15 13"
        stroke="#2C3E50"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  ),
  fuel: (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <path
        d="M6 12c0 4-2 6-2 8 0 2 2 2 6 2s6 0 6-2c0-2-2-4-2-8"
        fill="#A8E6CF"
        stroke="#10B981"
        strokeWidth="1"
      />
      <path d="M12 6c0 2-1 4-1 6v6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  move: (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#FF6B81" strokeWidth="1.5" />
      <path d="M7 12h10M12 7v10" stroke="#FF6B81" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#FF6B81" />
    </svg>
  ),
}

interface AdviceModalProps {
  isOpen: boolean
  onClose: () => void
  phase: string
  phaseDay: number
}

export const AdviceModal: React.FC<AdviceModalProps> = ({
  isOpen,
  onClose,
  phase,
  phaseDay,
}) => {
  if (!isOpen) return null

  const hint = PHASE_HINTS[phase] || PHASE_HINTS['經期']

  // 根據 phase 選擇對應的每日指南
  const dailyGuides: Record<string, Record<number, any>> = {
    經期: MENSTRUATION_DAILY,
    濾泡期: FOLLICULAR_DAILY,
    易孕期: FERTILE_WINDOW_DAILY,
    黃體期: LUTEAL_DAILY,
  }

  const dailyContent = dailyGuides[phase]?.[phaseDay]

  // 顯示每日詳細建議
  const rows = dailyContent
    ? [
        { icon: ADVICE_ICONS.energy, lbl: '能量狀態', val: dailyContent.energy },
        { icon: ADVICE_ICONS.body, lbl: '身體提醒', val: dailyContent.body },
        { icon: ADVICE_ICONS.mood, lbl: '情緒狀況', val: dailyContent.mood },
        { icon: ADVICE_ICONS.fuel, lbl: '營養建議', val: dailyContent.fuel },
        { icon: ADVICE_ICONS.move, lbl: '運動建議', val: dailyContent.move },
      ]
    : [
        { icon: ADVICE_ICONS.body, lbl: '身體特性', val: hint.body },
        { icon: ADVICE_ICONS.move, lbl: '減重 / 運動', val: hint.fitness },
        { icon: ADVICE_ICONS.fuel, lbl: '營養補充', val: hint.nutrition },
      ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="advice-modal-header">
          <div
            style={{ marginBottom: '18px', display: 'flex', alignItems: 'baseline', gap: '6px' }}
          >
            <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: hint.textC }}>
              {phase}第{phaseDay}天
            </span>
          </div>
          <div
            style={{
              fontSize: 'var(--fs-lg)',
              fontWeight: 700,
              color: hint.textC,
              marginBottom: '16px',
            }}
          > 
            今日身體說明書
          </div>
        </div>

        <div className="advice-items">
          {rows.map((r, i) => (
            <div className="advice-item" key={i}>
              <div className="advice-item-ic" style={{ background: hint.iconBg }}>
                {r.icon}
              </div>
              <div className="advice-item-body">
                <div className="advice-item-ttl" style={{ color: hint.lblC }}>
                  {r.lbl}
                </div>
                <div className="advice-item-text" style={{ color: hint.textC }}>
                  {r.val}
                </div>
              </div>
            </div>
          ))}
        </div>

        {dailyContent && (
          <div
            className="advice-summary-box"
            style={{ background: hint.bg, border: `1px solid ${hint.border}` }}
          >
            <div className="advice-summary-label" style={{ color: hint.lblC }}>
              小總結
            </div>
            <div className="advice-summary-text" style={{ color: hint.textC }}>
              {dailyContent.summary}
            </div>
          </div>
        )}

        <button className="advice-confirm-btn" style={{ background: hint.color }} onClick={onClose}>
          了解了，謝謝
        </button>
      </div>
    </div>
  )
}
