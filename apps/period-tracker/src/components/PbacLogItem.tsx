import React from 'react'
import { PbacLog } from '../types'
import { ProductSVG } from './ProductSVG'
import { BLOOD_COLORS, CLOT_TYPES, PBAC_LEVELS, getScore } from '@vitera/utils'

interface PbacLogItemProps {
  log: PbacLog
  defaultProduct: 'pad' | 'tampon' | 'cup'
  onDelete: (id: number) => void
}

export const PbacLogItem: React.FC<PbacLogItemProps> = ({ log, defaultProduct, onDelete }) => {
  const colorObj = BLOOD_COLORS.find((c) => c.id === log.color)
  const clotObj = CLOT_TYPES.find((c) => c.id === log.clot)
  const lvName = PBAC_LEVELS.find((lv) => lv.id === log.level)?.name

  return (
    <div className="pbac-log-item">
      <div className="pbac-log-svg">
        <ProductSVG type={log.product || defaultProduct} level={log.level} />
      </div>
      <div className="pbac-log-info">
        <div className="pbac-log-name">
          {lvName}
          {(colorObj || (clotObj && log.clot !== 'none')) && (
            <span className="pli-dot-sep"> · </span>
          )}
          {colorObj && (
            <span className="pli-badge">
              <span className="pli-color-dot" style={{ color: colorObj.hex }}>
                ●
              </span>{' '}
              {colorObj.label}
            </span>
          )}
          {colorObj && clotObj && log.clot !== 'none' && <span>&nbsp;</span>}
          {clotObj && log.clot !== 'none' && (
            <span className={`pli-badge ${clotObj.warn ? 'warn' : ''}`}>{clotObj.label}</span>
          )}
        </div>
        <div className="pbac-log-time">{log.time}</div>
      </div>
      <div className="pli-right-wrap">
        <div className="pli-score-val">+{getScore(log.level, log.clot)}</div>
        <button className="pbac-log-del" onClick={() => onDelete(log.id)}>
          ×
        </button>
      </div>
    </div>
  )
}
