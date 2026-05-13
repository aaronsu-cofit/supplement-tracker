import React from 'react'

interface PbacInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PbacInfoModal: React.FC<PbacInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pbac-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pbac-info-modal-header">
          <div className="pbac-info-modal-title">經血量分數說明</div>
          <button className="pbac-info-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="pbac-info-modal-body">
          <div className="pbac-info-section">
            <strong>📊 分數說明</strong>
            <br />
            <span className="pbac-info-subtitle">分數越高代表經血量越多</span>
          </div>

          <div className="pbac-info-score-box">
            <div className="pbac-info-score-grid">
              <div>
                <strong className="pbac-info-range-safe">0-30 分</strong>
                <br />
                <span className="pbac-info-subtitle">經血量較少</span>
              </div>
              <div>
                <strong className="pbac-info-range-safe">30-60 分</strong>
                <br />
                <span className="pbac-info-subtitle">接近正常</span>
              </div>
              <div>
                <strong className="pbac-info-range-warn">60-80 分</strong>
                <br />
                <span className="pbac-info-subtitle">接近警戒線</span>
              </div>
              <div>
                <strong className="pbac-info-range-danger">100+ 分</strong>
                <br />
                <span className="pbac-info-subtitle">經血過多</span>
              </div>
            </div>
          </div>

          <div className="pbac-info-std-box">
            <strong>
              <svg viewBox="0 0 24 24" className="pbac-icon-sm">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="1"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                />
                <line x1="6" y1="9" x2="18" y2="9" stroke="#3B82F6" strokeWidth="1" />
                <line x1="6" y1="14" x2="18" y2="14" stroke="#3B82F6" strokeWidth="1" />
              </svg>
              經血量標準
            </strong>
            <br />
            &lt; 35ml 過少 <span className="pbac-info-dot-blue">●</span> | 35-80ml 正常{' '}
            <svg viewBox="0 0 24 24" className="pbac-icon-std">
              <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2" fill="none" />
              <path
                d="M8 12l3 3 6-6"
                stroke="#10B981"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>{' '}
            | &gt; 80ml 過多
          </div>

          <div className="pbac-info-footer">
            <svg viewBox="0 0 24 24" className="pbac-icon-sm">
              <circle cx="12" cy="6" r="1.5" fill="#9CA3AF" />
              <path d="M12 9v6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            根據您的紀錄計算分數，可幫助了解經血量是否正常。
          </div>
        </div>
      </div>
    </div>
  )
}
