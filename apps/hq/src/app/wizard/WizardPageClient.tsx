'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@vitera/lib'
import type { Node, Edge } from '@xyflow/react'
import WizardEditor from './WizardEditor'

interface OA { id: number; name: string; is_active: boolean }
interface Scenario { id: string; name: string; flow_nodes: unknown; flow_edges: unknown; is_active: boolean }

const DEFAULT_NODES: Node[] = [
  { id: 'day-0', type: 'day-node', position: { x: 80, y: 180 }, data: { day: 0, label: 'Follow' } },
]

export default function WizardPageClient() {
  const [oas, setOas] = useState<OA[]>([])
  const [selectedOAId, setSelectedOAId] = useState<string>('default')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [editorKey, setEditorKey] = useState('new')

  useEffect(() => {
    apiFetch('/api/line/oa')
      .then(r => r.json())
      .then(({ oas: data }: { oas: OA[] }) => setOas(data ?? []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoadingScenarios(true)
    setScenarios([])
    setSelectedScenarioId(null)
    setEditorKey('new')
    apiFetch(`/api/wizard/oa/${selectedOAId}/scenarios`)
      .then(r => r.json())
      .then(({ scenarios: data }: { scenarios: Scenario[] }) => setScenarios(data ?? []))
      .catch(console.error)
      .finally(() => setLoadingScenarios(false))
  }, [selectedOAId])

  const handleOAChange = useCallback((oaId: string) => {
    setSelectedOAId(oaId)
  }, [])

  const handleScenarioSelect = useCallback((scenario: Scenario) => {
    setSelectedScenarioId(scenario.id)
    setEditorKey(scenario.id)
  }, [])

  const handleNewScenario = useCallback(() => {
    setSelectedScenarioId(null)
    setEditorKey(`new-${Date.now()}`)
  }, [])

  const handleSaved = useCallback((id: string, name: string) => {
    setSelectedScenarioId(id)
    setScenarios(prev => {
      const exists = prev.find(s => s.id === id)
      if (exists) return prev.map(s => s.id === id ? { ...s, name } : s)
      return [{ id, name, flow_nodes: [], flow_edges: [], is_active: false }, ...prev]
    })
  }, [])

  const handleToggleActive = useCallback(async (scenario: Scenario) => {
    const newValue = !scenario.is_active
    try {
      await apiFetch(`/api/wizard/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newValue }),
      })
      setScenarios(prev => prev.map(s => s.id === scenario.id ? { ...s, is_active: newValue } : s))
    } catch (err) {
      console.error('[wizard] toggle active error:', err)
    }
  }, [])

  const handleDeleteScenario = useCallback(async (scenario: Scenario) => {
    if (!window.confirm(`Delete scenario "${scenario.name}"?`)) return
    try {
      await apiFetch(`/api/wizard/scenarios/${scenario.id}`, { method: 'DELETE' })
      setScenarios(prev => prev.filter(s => s.id !== scenario.id))
      if (selectedScenarioId === scenario.id) {
        setSelectedScenarioId(null)
        setEditorKey(`new-${Date.now()}`)
      }
    } catch (err) {
      console.error('[wizard] delete error:', err)
    }
  }, [selectedScenarioId])

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* OA + scenario picker bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0d0d0d] border-b border-white/[0.08] shrink-0">
        <select
          value={selectedOAId}
          onChange={e => handleOAChange(e.target.value)}
          className="bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
        >
          <option value="default">Default (legacy)</option>
          {oas.map(oa => (
            <option key={oa.id} value={String(oa.id)}>{oa.name}</option>
          ))}
        </select>
        <div className="w-px h-4 bg-white/10 shrink-0" />
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          <button
            onClick={handleNewScenario}
            className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-[rgba(124,92,252,0.15)] text-[#a78bfa] border border-[rgba(124,92,252,0.3)] hover:bg-[rgba(124,92,252,0.25)] transition-colors cursor-pointer"
          >
            + New
          </button>
          {loadingScenarios && (
            <span className="text-xs text-white/30 shrink-0">Loading...</span>
          )}
          {scenarios.map(s => {
            const isSelected = s.id === selectedScenarioId
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleScenarioSelect(s)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-transparent text-white/50 border-white/10 hover:text-white/80 hover:border-white/20'
                  }`}
                >
                  {s.name}
                  {s.is_active && <span className="ml-1 text-[#5ce0d8]">●</span>}
                </button>
                {isSelected && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleToggleActive(s)}
                      title={s.is_active ? 'Deactivate' : 'Activate'}
                      className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${
                        s.is_active
                          ? 'text-[#5ce0d8] border-[#5ce0d8]/30 bg-[#5ce0d8]/10 hover:bg-[#5ce0d8]/20'
                          : 'text-white/30 border-white/10 bg-white/5 hover:text-[#5ce0d8] hover:border-[#5ce0d8]/20'
                      }`}
                    >
                      ●
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(s)}
                      title="Delete scenario"
                      className="text-[11px] w-6 h-6 flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Canvas — key remounts EditorInner to reset nodes/edges when scenario changes */}
      <WizardEditor
        key={editorKey}
        oaId={selectedOAId}
        scenarioId={selectedScenarioId}
        scenarioName={selectedScenario?.name ?? 'New Scenario'}
        initialNodes={(selectedScenario?.flow_nodes as Node[] | undefined) ?? DEFAULT_NODES}
        initialEdges={(selectedScenario?.flow_edges as Edge[] | undefined) ?? []}
        onSaved={handleSaved}
      />
    </div>
  )
}
