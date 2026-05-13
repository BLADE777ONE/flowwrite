interface EditorTopBarProps {
  title: string
  saving: boolean
  hasCurrentSong: boolean
  onTitleChange: (title: string) => void
  onSave: () => void
  onDelete: () => void
}

export function EditorTopBar({ title, saving, hasCurrentSong, onTitleChange, onSave, onDelete }: EditorTopBarProps) {
  return (
    <div className="h-16 border-b border-[#262631] flex items-center px-6 gap-3 bg-[#151519]">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] font-bold mb-0.5">Canção atual</p>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="bg-transparent text-xl font-semibold text-white focus:outline-none w-full placeholder-gray-600"
          placeholder="Título da música..."
        />
      </div>
      <div className={`hidden xl:flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold rounded-full px-2.5 py-1 border ${saving ? 'text-yellow-300 border-yellow-800/70 bg-yellow-900/20' : 'text-green-300 border-green-800/70 bg-green-900/20'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${saving ? 'bg-yellow-400' : 'bg-green-400'}`} />
        {saving ? 'salvando' : 'salvo'}
      </div>
      <button
        onClick={onSave}
        disabled={!hasCurrentSong || saving}
        className="px-3 py-2 text-xs font-semibold rounded-md bg-purple-700/40 hover:bg-purple-700/70 text-purple-200 border border-purple-700/50 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
      <button
        onClick={onDelete}
        disabled={!hasCurrentSong}
        className="px-3 py-2 text-xs font-semibold rounded-md bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        Excluir
      </button>
    </div>
  )
}
