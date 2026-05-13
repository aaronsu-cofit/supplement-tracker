import React, { useRef, useEffect } from 'react'

interface DrumPickerProps {
  items: (string | number)[]
  value: string | number
  onChange: (val: string | number) => void
  unit?: string
  className?: string
}

export const DrumPicker: React.FC<DrumPickerProps> = ({
  items,
  value,
  onChange,
  unit,
  className,
}) => {
  const scrollRef = useRef<any>(null)
  const ITEM_H = 48

  useEffect(() => {
    if (scrollRef.current) {
      const idx = items.indexOf(value)
      if (idx !== -1) {
        scrollRef.current.scrollTop = idx * ITEM_H
      }
    }
  }, [value, items])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollTop / ITEM_H)
    if (items[idx] !== undefined && items[idx] !== value) {
      onChange(items[idx])
    }
  }

  return (
    <div className={`drum-col ${className || ''}`} ref={scrollRef} onScroll={handleScroll}>
      <div className="drum-spacer" />
      {items.map((item, i) => {
        const idx = items.indexOf(value)
        const dist = Math.abs(i - idx)
        const opacity = dist === 0 ? '1' : dist === 1 ? '0.45' : '0.18'
        const fontSize = dist === 0 ? '20px' : '14px'
        const color = dist === 0 ? 'var(--t1)' : 'var(--t3)'
        const fontWeight = dist === 0 ? '600' : '400'

        return (
          <div key={item} className="drum-item" style={{ opacity, fontSize, color, fontWeight }}>
            {item}
            {unit}
          </div>
        )
      })}
      <div className="drum-spacer" />
    </div>
  )
}
