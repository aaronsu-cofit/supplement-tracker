import React from 'react'

interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (val: number) => void
  unit: string
}

export const Stepper: React.FC<StepperProps> = ({ value, min, max, onChange, unit }) => (
  <div className="stepper">
    <button className="step-btn" onClick={() => onChange(Math.max(min, value - 1))}>
      −
    </button>
    <div className="step-track">
      <div className="step-val">{value}</div>
      <div className="step-unit">{unit}</div>
    </div>
    <button className="step-btn" onClick={() => onChange(Math.min(max, value + 1))}>
      +
    </button>
  </div>
)
