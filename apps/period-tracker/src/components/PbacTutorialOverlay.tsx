import React, { useLayoutEffect, useState } from 'react'

interface PbacTutorialOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export const PbacTutorialOverlay: React.FC<PbacTutorialOverlayProps> = ({ isOpen, onClose }) => {
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    radius: 60,
    tooltipX: 0,
    tooltipY: 0,
  })

  useLayoutEffect(() => {
    if (!isOpen) return

    const updatePos = () => {
      // 查找 PBAC 分數信息按鈕
      const infoBtn = document.getElementById('pbac-score-info')
      if (!infoBtn) return

      const rect = infoBtn.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const radius = 60

      // Tooltip 寬度和高度
      const tooltipWidth = 200
      const tooltipHeight = 140

      // 三層優先級定位（參考 Period_Tracking 邏輯）
      let tooltipY: number
      if (rect.top > tooltipHeight + 20) {
        // 優先：在上方
        tooltipY = rect.top - tooltipHeight - 20
      } else if (window.innerHeight - rect.bottom > tooltipHeight + 20) {
        // 次選：在下方
        tooltipY = rect.bottom + 20
      } else {
        // 最後：垂直居中
        tooltipY = (window.innerHeight - tooltipHeight) / 2
      }

      // 水平居中並防止超出邊界
      const tooltipX = Math.max(
        12,
        Math.min(window.innerWidth - tooltipWidth - 12, centerX - tooltipWidth / 2)
      )

      setPos({
        top: centerY,
        left: centerX,
        radius,
        tooltipX,
        tooltipY,
      })
    }

    const timer = setTimeout(updatePos, 300)
    window.addEventListener('resize', updatePos)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePos)
    }
  }, [isOpen])

  const handleClose = () => {
    localStorage.setItem('pbacTutorialShown', 'true')
    onClose()
  }

  if (!isOpen) return null

  const tooltipStyle: React.CSSProperties = {
    left: `${pos.tooltipX}px`,
    top: `${pos.tooltipY}px`,
    width: '200px',
    position: 'fixed',
    zIndex: 552,
  }

  return (
    <div id="pbac-tutorial-overlay" onClick={handleClose}>
      <div className="pbac-tutorial-backdrop"></div>
      <div
        className="pbac-tutorial-spotlight"
        style={{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          width: `${pos.radius * 2}px`,
          height: `${pos.radius * 2}px`,
          marginLeft: `-${pos.radius}px`,
          marginTop: `-${pos.radius}px`,
        }}
      ></div>
      <div className="pbac-tutorial-tooltip" style={tooltipStyle}>
        <div className="pbac-tutorial-content">
          <div className="pbac-tutorial-text">
            分數越高
            <br />
            代表經血量越多
          </div>
          <button
            className="pbac-tutorial-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
          >
            知道了
          </button>
        </div>
        <div className="pbac-tutorial-arrow"></div>
      </div>
    </div>
  )
}
