import React from 'react'
import { BLOOD_COLORS, BlankBloodColor } from '@vitera/utils'

export const TestTube: React.FC<{ colors: string[] }> = ({ colors }) => {
  const layerHeight = colors.length > 0 ? 100 / colors.length : 0
  const isUnrecorded = !colors.length
  return (
    <div className="test-tube-wrapper">
      <div className="test-tube-rim" />
      <div className="test-tube-body">
        {
          isUnrecorded && <div
              className="liquid-sample"
              style={{
                height: "100%",
                backgroundColor: BlankBloodColor?.hex,
              }}
            />
        }
        {colors.map((cId, i) => {
          const colorObj = BLOOD_COLORS.find((bc) => bc.id === cId)
          return (
            <div
              key={i}
              className="liquid-sample"
              style={{
                height: `${layerHeight}%`,
                backgroundColor: colorObj ? colorObj.hex : '#ccc',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
