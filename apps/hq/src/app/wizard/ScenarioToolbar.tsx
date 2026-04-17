interface Props {
  name: string
  onNameChange: (v: string) => void
  onSave: () => void
  saving: boolean
  lastSaved: Date | null
}

export default function ScenarioToolbar({ name, onNameChange, onSave, saving, lastSaved }: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-[rgba(20,20,20,0.95)] border border-white/10 rounded-xl px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="bg-transparent border-none outline-none text-white font-semibold text-sm w-48 placeholder:text-white/30"
        placeholder="Scenario name..."
      />
      <div className="w-px h-4 bg-white/10" />
      <button
        onClick={onSave}
        disabled={saving}
        className="text-sm text-white/60 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-default cursor-pointer bg-transparent border-none"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      {lastSaved && (
        <span className="text-[10px] text-white/25">
          Saved {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
