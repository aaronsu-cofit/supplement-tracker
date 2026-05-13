import React from 'react'

export type CancelModalMode = 'first-day' | 'middle-day'

interface CancelPeriodModalProps {
  isOpen: boolean
  mode: CancelModalMode
  successorsCount: number
  onClose: () => void
  onConfirmOnlyToday: () => void
  onConfirmClearFollowing: () => void // For middle-day: "清除本日及之後所有" | For first-day: "清除整個經期記錄"
}

export const CancelPeriodModal: React.FC<CancelPeriodModalProps> = ({
  isOpen,
  mode,
  successorsCount,
  onClose,
  onConfirmOnlyToday,
  onConfirmClearFollowing,
}) => {
  if (!isOpen) return null

  const isFirstDay = mode === 'first-day'

  return (
    <div className="modal-overlay bottom-sheet" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-simple">
          <div className="modal-title-left">取消經期標記</div>
        </div>
        <div className="modal-body-simple">
          <div className="modal-desc-text">
            {isFirstDay ? `後續 ${successorsCount} 天有記錄。您想要：` : '該天之後有記錄。您想要：'}
          </div>

          <div className="modal-btn-col">
            <button className="modal-btn-white" onClick={onConfirmOnlyToday}>
              只取消本日標記
            </button>

            <button className="modal-btn-pink" onClick={onConfirmClearFollowing}>
              {isFirstDay ? '清除整個經期記錄' : '清除本日及之後所有'}
            </button>

            <button className="modal-btn-ghost" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
