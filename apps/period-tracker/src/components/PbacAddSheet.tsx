import React, { useState } from 'react'
import { BLOOD_COLORS, CLOT_TYPES, PBAC_LEVELS } from '@repo/utils'
import { PbacLog } from '../types'
import { ProductSVG } from './ProductSVG'

interface PbacAddSheetProps {
  currentProduct: 'pad' | 'tampon' | 'cup'
  onAdd: (log: Omit<PbacLog, 'id' | 'time'>) => void
  onCancel: () => void
}

export const PbacAddSheet: React.FC<PbacAddSheetProps> = ({ currentProduct, onAdd, onCancel }) => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedClot, setSelectedClot] = useState<string | null>(null)

  const handleAdd = () => {
    if (!selectedLevel) return
    onAdd({
      level: selectedLevel as any,
      color: selectedColor || undefined,
      clot: selectedClot || undefined,
      product: currentProduct,
    })
  }

  const activeClot = CLOT_TYPES.find((ct) => ct.id === selectedClot)

  return (
    <div className="pbac-add-sheet">
      <div className="pbac-add-title">這次浸透程度</div>
      <div className="pbac-add-options">
        {PBAC_LEVELS.map((lv) => (
          <div
            key={lv.id}
            className={`pbac-add-opt ${selectedLevel === lv.id ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(lv.id)}
          >
            <div className="pbac-add-opt-svg">
              <ProductSVG type={currentProduct} level={lv.id} />
            </div>
            <div className="pbac-add-opt-info">
              <div className="pbac-add-opt-name">{lv.name}</div>
              <div className="pbac-add-opt-desc">
                {lv.desc} · +{lv.score} 分
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pbac-add-title pbac-add-title-mt10">這次的顏色</div>
      <div className="pbac-color-grid">
        {BLOOD_COLORS.map((c) => (
          <div
            key={c.id}
            className={`pbac-color-item ${selectedColor === c.id ? 'selected' : ''}`}
            onClick={() => setSelectedColor(c.id)}
          >
            <div className="pbac-color-circle" style={{ background: c.hex }} />
            <div className="pbac-color-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="pbac-add-title pbac-add-title-mt10">血塊狀況</div>
      <div className="pbac-clot-grid">
        {CLOT_TYPES.map((ct) => (
          <div
            key={ct.id}
            className={`pbac-clot-item ${selectedClot === ct.id ? 'selected' : ''} ${
              selectedClot === ct.id && ct.warn ? 'warn' : ''
            }`}
            onClick={() => setSelectedClot(ct.id)}
          >
            <div className="pbac-clot-label">{ct.label}</div>
            {ct.desc && <div className="pbac-clot-desc">{ct.desc}</div>}
            <div className="pbac-clot-score">+{ct.score}分</div>
          </div>
        ))}
      </div>

      {activeClot?.warn && (
        <div className="pbac-clot-warn-box">
          燒仙草（大塊軟）或仙草凍（質地硬、肉塊狀）都是警訊。直徑超過 3cm，建議諮詢婦科醫師。
        </div>
      )}

      <button
        className="pbac-add-confirm pbac-add-confirm-mt12"
        disabled={!selectedLevel}
        onClick={handleAdd}
      >
        新增這一筆
      </button>
      <button className="pbac-add-cancel" onClick={onCancel}>
        取消
      </button>
    </div>
  )
}
