interface Props {
  name: string
  onNameChange: (v: string) => void
  onSave: () => void
  saving: boolean
  lastSaved: Date | null
}

export default function ScenarioToolbar({ name, onNameChange, onSave, saving, lastSaved }: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-[rgba(20,20,20,0.95)] border border-white/10 rounded-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1 outline-none text-white font-semibold text-sm w-48 placeholder:text-white/30 focus:border-white/30"
        placeholder="Scenario name..."
      />
      <button
        onClick={onSave}
        disabled={saving || !name.trim()}
        title="Save (Cmd/Ctrl+S)"
        className="text-sm px-3 py-1 rounded-md bg-[rgba(124,92,252,0.2)] text-[#a78bfa] border border-[rgba(124,92,252,0.4)] hover:bg-[rgba(124,92,252,0.3)] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
      >
        {saving ? '儲存中...' : '💾 儲存'}
      </button>
      {lastSaved && (
        <span className="text-[10px] text-[#5ce0d8]/70 whitespace-nowrap">
          ✓ {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
