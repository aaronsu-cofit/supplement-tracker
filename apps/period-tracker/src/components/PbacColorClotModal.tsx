import React from 'react'

interface PbacColorClotModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PbacColorClotModal: React.FC<PbacColorClotModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content pbac-color-clot-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pbac-color-clot-modal-header">
          <div className="pbac-color-clot-modal-title">經血量顏色和血塊</div>
          <button className="pbac-color-clot-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="pbac-color-clot-modal-body">
          <div className="pbac-color-clot-section">
            <strong>🎨 經血量顏色</strong>
            <p>顯示當天每次更換時記錄的顏色。若換了三次、三次顏色不同，就會同時呈現三種顏色。</p>
          </div>

          <div className="pbac-color-clot-section">
            <strong>🩸 血塊</strong>
            <p>只顯示當天最嚴重的一次。例如同天記過小碎塊和仙草凍，這裡就只顯示仙草凍。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
