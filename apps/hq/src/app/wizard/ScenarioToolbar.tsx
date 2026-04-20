interface Props {
  name: string
  onNameChange: (v: string) => void
  onSave: () => void
  saving: boolean
  lastSaved: Date | null
}

export default function ScenarioToolbar({ name, onNameChange, onSave, saving, lastSaved }: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 outline-none text-slate-900 font-semibold text-sm w-48 placeholder:text-slate-400 focus:border-slate-400"
        placeholder="Scenario name..."
      />
      <button
        onClick={onSave}
        disabled={saving || !name.trim()}
        title="Save (Cmd/Ctrl+S)"
        className="text-sm px-3 py-1 rounded-md bg-[rgba(124,58,237,0.1)] text-[#7c3aed] border border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.18)] hover:text-[#6d28d9] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default whitespace-nowrap font-medium"
      >
        {saving ? '儲存中...' : '💾 儲存'}
      </button>
      {lastSaved && (
        <span className="text-[11px] text-emerald-600 whitespace-nowrap font-medium">
          ✓ {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
