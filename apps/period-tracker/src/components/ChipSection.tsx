import React from 'react'

interface ChipSectionProps {
  label: string
  items: string[]
  selectedItems: string[]
  onToggle: (item: string) => void
  mtClass?: string
  chipClass?: string
}

export const ChipSection: React.FC<ChipSectionProps> = ({
  label,
  items,
  selectedItems,
  onToggle,
  mtClass = 'pf-label-mt10',
  chipClass = '',
}) => {
  return (
    <>
      <div className={`pf-label ${mtClass}`}>{label}</div>
      <div className="chip-wrap">
        {items.map((item) => (
          <div
            key={item}
            className={`chip ${chipClass} ${selectedItems.includes(item) ? 'on' : ''}`}
            onClick={() => onToggle(item)}
          >
            {item}
          </div>
        ))}
      </div>
    </>
  )
}
