import React, { useState } from 'react'
import { CLOT_TYPES, BLOOD_COLORS } from '@repo/utils'
import { PbacLog } from '../types'
import { ProductSVG } from './ProductSVG'

interface PbacOverlayProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (log: Partial<PbacLog>, product: string, color: string, clot: string) => void
  cycleDay: number
  dayLogs?: PbacLog[]
  initialProduct?: string
  initialColor?: string
  initialClot?: string
}

export const PbacOverlay: React.FC<PbacOverlayProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cycleDay,
  dayLogs = [],
  initialProduct = 'pad',
  initialColor,
  initialClot,
}) => {
  const [level, setLevel] = useState<'light' | 'medium' | 'heavy' | null>(null)
  const [product, setProduct] = useState(initialProduct)
  const [color, setColor] = useState(initialColor || '')
  const [clot, setClot] = useState(initialClot || 'none')

  if (!isOpen) return null

  const isWarn = clot === 'large' || (clot === 'small' && cycleDay > 2)

  const todayScore = dayLogs.reduce((s, l) => {
    const lvScore = l.level === 'light' ? 1 : l.level === 'medium' ? 5 : 20
    let clotScore = 0
    if (l.clot && l.clot !== 'none') {
      const ct = CLOT_TYPES.find((c) => c.id === l.clot)
      clotScore = ct ? ct.score : 0
    }
    return s + lvScore + clotScore
  }, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pbac-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="pbac-overlay-handle"></div>
        <div className="pbac-overlay-header">
          <div className="pbac-overlay-title">這次的量？</div>
          <div className="pbac-overlay-summary">
            今日 {dayLogs.length} 筆・{todayScore} 分
          </div>
        </div>
        <div className="pbac-overlay-day">經期第 {cycleDay} 天</div>

        <div className="pbac-product-row">
          {['pad', 'tampon', 'cup'].map((p) => (
            <div
              key={p}
              className={`pbac-product-btn ${product === p ? 'on' : ''}`}
              onClick={() => setProduct(p)}
            >
              <div className="pbac-product-icon">
                <img src={`/assets/icons/${p}.png`} className="pbac-product-icon-img" alt={p} />
              </div>
              <div className="pbac-product-label">
                {p === 'pad' ? '衛生棉' : p === 'tampon' ? '棉條' : '月亮杯'}
              </div>
            </div>
          ))}
        </div>

        <div className="pbac-level-row">
          {(['light', 'medium', 'heavy'] as const).map((lv) => (
            <div
              key={lv}
              className={`pbac-level-item ${level === lv ? 'selected' : ''}`}
              onClick={() => setLevel(lv)}
            >
              <div className="pbac-svg-wrap">
                <ProductSVG type={product} level={lv} />
              </div>
              <div className="pbac-level-info">
                <div className="pbac-level-name">
                  {lv === 'light' ? '輕微' : lv === 'medium' ? '中度' : '重度'}
                </div>
                <div className="pbac-level-desc">
                  {lv === 'light'
                    ? '佔面積 1/3 以下'
                    : lv === 'medium'
                      ? '佔面積 1/2 至 2/3'
                      : '完全浸透'}
                </div>
              </div>
              <div className="pbac-log-score">
                +{lv === 'light' ? 1 : lv === 'medium' ? 5 : 20}分
              </div>
            </div>
          ))}
        </div>

        <div id="q-color-section" className="quick-overlay-section">
          <div className="quick-overlay-label">今日顏色</div>
          <div className="blood-color-row">
            {BLOOD_COLORS.map((c) => (
              <div
                key={c.id}
                className={`blood-color-btn ${color === c.id ? 'on' : ''}`}
                onClick={() => setColor(c.id)}
              >
                <div className="blood-color-swatch" style={{ background: c.hex }}></div>
                <div className="blood-color-lbl">{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="q-clot-section" className="quick-overlay-section">
          <div className="quick-overlay-label">血塊狀況</div>
          <div className="clot-row">
            {CLOT_TYPES.map((ct) => {
              const isSelected = clot === ct.id
              const shouldWarn = ct.id === 'large' || (ct.id === 'small' && cycleDay > 2)
              const cls = isSelected
                ? shouldWarn
                  ? 'clot-btn warn-on'
                  : 'clot-btn on'
                : 'clot-btn'

              return (
                <div key={ct.id} className={cls} onClick={() => setClot(ct.id)}>
                  <div className="clot-btn-name">{ct.label}</div>
                  {ct.desc && <div className="clot-btn-desc">{ct.desc}</div>}
                  <div className="clot-btn-score">+{ct.score}分</div>
                </div>
              )
            })}
          </div>
        </div>

        {isWarn && (
          <div className="clot-warn-box">
            燒仙草（大塊軟）或仙草凍（質地硬、肉塊狀）都是警訊。直徑超過
            3cm，或第4天後仍有碎果凍，建議諮詢婦科醫師。
          </div>
        )}

        <button
          className="pbac-overlay-btn-add"
          disabled={!level}
          onClick={() =>
            level &&
            onConfirm(
              {
                level,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
              product,
              color,
              clot
            )
          }
        >
          新增這一筆
        </button>
        <button className="pbac-overlay-btn-cancel" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  )
}
