'use client'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export default function WizardEditor() {
  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', height: '100vh', background: '#0d0d0d', color: '#fff' }}>
        <div style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Block Palette — Task 3</p>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.2)' }}>Canvas — Task 3</p>
        </div>
        <div style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Config Panel — Task 4</p>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
