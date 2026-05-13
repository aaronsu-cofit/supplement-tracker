import React, { useLayoutEffect, useState } from 'react'

interface TutorialOverlayProps {
  isOpen: boolean
  onNext: () => void
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onNext }) => {
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    radius: 0,
    placement: 'above' as 'above' | 'below',
    tooltipX: 0,
    tooltipY: 0,
  })

  useLayoutEffect(() => {
    if (!isOpen) return

    const updatePos = () => {
      const calCard = document.querySelector('.cal-card')
      if (!calCard) return

      const rect = calCard.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const radius = Math.max(rect.width, rect.height) / 1.5

      // Original app dimensions and logic
      const tooltipWidth = 180
      const tooltipHeight = 110 // Estimated height including padding and button

      let placement: 'above' | 'below'
      let tooltipY: number

      if (rect.top > tooltipHeight + 20) {
        placement = 'above'
        tooltipY = rect.top - tooltipHeight - 20
      } else {
        placement = 'below'
        tooltipY = rect.bottom + 20
      }

      // Horizontal center and prevent overflow (from original logic)
      const tooltipX = Math.max(
        12,
        Math.min(window.innerWidth - tooltipWidth - 12, centerX - tooltipWidth / 2)
      )

      setPos({
        top: centerY,
        left: centerX,
        radius,
        placement,
        tooltipX,
        tooltipY,
      })
    }

    const timer = setTimeout(updatePos, 100)
    window.addEventListener('resize', updatePos)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePos)
    }
  }, [isOpen])

  if (!isOpen) return null

  const text = '點擊日期開始紀錄'
  const isAbove = pos.placement === 'above'

  const tooltipStyle: React.CSSProperties = {
    left: `${pos.tooltipX}px`,
    top: `${pos.tooltipY}px`,
    width: '180px', // Original width
    position: 'fixed',
    zIndex: 502,
  }

  const arrowStyle: React.CSSProperties = isAbove
    ? {
        bottom: '-10px',
        top: 'auto',
        borderTop: '12px solid #fff',
        borderBottom: 'none',
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
      }
    : {
        top: '-10px',
        bottom: 'auto',
        borderBottom: '12px solid #fff',
        borderTop: 'none',
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
      }

  return (
    <div id="tutorial-overlay" onClick={onNext}>
      <div className="tutorial-backdrop"></div>
      <div
        className="tutorial-spotlight"
        style={{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          width: `${pos.radius * 2}px`,
          height: `${pos.radius * 2}px`,
          marginLeft: `-${pos.radius}px`,
          marginTop: `-${pos.radius}px`,
        }}
      ></div>
      <div className="tutorial-tooltip" style={tooltipStyle}>
        <div className="tutorial-content">
          <div className="tutorial-text" style={{ fontSize: '16px', marginBottom: '10px' }}>
            {text}
          </div>
          <button
            className="tutorial-btn"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
          >
            知道了
          </button>
        </div>
        <div className="tutorial-arrow" style={arrowStyle}></div>
      </div>
    </div>
  )
}
