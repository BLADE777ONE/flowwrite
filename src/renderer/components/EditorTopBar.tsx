import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import { SectionToolbar } from '../../features/editor/components/SectionToolbar'

interface EditorTopBarProps {
  title: string
  saving: boolean
  hasCurrentSong: boolean
  editor: Editor | null
  onTitleChange: (title: string) => void
  onSave: () => void
  onDelete: () => void
}

export function EditorTopBar({
  title,
  saving,
  hasCurrentSong,
  editor,
  onTitleChange,
  onSave,
  onDelete,
}: EditorTopBarProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <header className="h-16 border-b border-white/[0.07] flex items-center px-5 gap-3 bg-[#0c0c11]/95 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        onClick={() => setIsPlaying(value => !value)}
        className={`h-8 w-11 rounded-md border text-[10px] font-black uppercase tracking-wider transition ${
          isPlaying
            ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
            : 'border-white/[0.09] bg-white/[0.04] text-gray-300 hover:text-white hover:border-purple-400/50'
        }`}
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>

      <div className="hidden lg:flex items-center gap-2">
        <div className="h-8 rounded-md border border-white/[0.08] bg-black/30 px-2.5 flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.16em] text-gray-500 font-bold">BPM</span>
          <span className="font-mono text-xs text-white">128</span>
        </div>
        <div className="h-8 rounded-md border border-white/[0.08] bg-black/30 px-2.5 flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.16em] text-gray-500 font-bold">Beat</span>
          <span className="font-mono text-xs text-purple-200">Draft 01</span>
        </div>
      </div>

      <div className="h-8 w-px bg-white/[0.08]" />

      <div className="min-w-0 flex-1">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.24em] font-bold mb-0.5">
          Canção atual
        </p>
        <input
          type="text"
          value={title}
          onChange={event => onTitleChange(event.target.value)}
          className="bg-transparent text-base xl:text-lg font-black text-white focus:outline-none w-full placeholder-gray-600 leading-none"
          placeholder="Título da música..."
        />
      </div>

      <SectionToolbar editor={editor} />

      <div className={`hidden xl:flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black rounded-full px-2.5 py-1 border ${
        saving
          ? 'text-yellow-300 border-yellow-800/70 bg-yellow-900/20'
          : 'text-green-300 border-green-800/70 bg-green-900/20'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${saving ? 'bg-yellow-400' : 'bg-green-400'}`} />
        {saving ? 'salvando' : 'salvo'}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!hasCurrentSong || saving}
        className="px-3 py-2 text-xs font-bold rounded-md bg-purple-700/40 hover:bg-purple-700/70 text-purple-100 border border-purple-600/50 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={!hasCurrentSong}
        className="px-3 py-2 text-xs font-bold rounded-md bg-red-950/35 hover:bg-red-900/55 text-red-300 border border-red-900/50 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        Excluir
      </button>
    </header>
  )
}
