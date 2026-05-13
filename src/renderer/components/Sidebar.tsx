import type { Project, Song } from '../types'

interface SidebarProps {
  songs: Song[]
  currentProject: Project | null
  currentSong: Song | null
  onNewLyric: () => void
  onSelectSong: (song: Song) => void
}

export function Sidebar({ songs, currentProject, currentSong, onNewLyric, onSelectSong }: SidebarProps) {
  return (
    <aside className="w-60 bg-[#08080c] border-r border-white/[0.07] flex flex-col shadow-[12px_0_36px_rgba(0,0,0,0.22)]">
      <div className="px-3.5 pt-3.5 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-100 font-black shadow-[0_0_18px_rgba(168,85,247,0.18)]">
            F
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white leading-tight tracking-tight">FlowWriter</h1>
            <p className="text-[9px] text-cyan-300 uppercase tracking-[0.2em] font-bold">Studio</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.035] p-2.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500 font-bold">Projeto</p>
          <p className="text-xs text-gray-100 truncate mt-1">{currentProject?.title ?? 'Sem projeto'}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
            <span>Letras</span>
            <span className="font-mono text-cyan-300">{songs.length.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-white/[0.06]">
        <button
          onClick={onNewLyric}
          className="w-full bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white py-2.5 px-3 rounded-md transition font-bold text-sm shadow-[0_0_24px_rgba(147,51,234,0.28)]"
        >
          + Nova Letra
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] mb-2 font-bold">Sessões</p>
        {songs.length === 0 && (
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">Nenhuma letra ainda. Clique em + Nova Letra.</p>
        )}
        {songs.map(song => (
          <button
            key={song.id}
            onClick={() => onSelectSong(song)}
            className={`group w-full text-left px-2.5 py-2 rounded-md border transition mb-1.5 relative overflow-hidden ${
              currentSong?.id === song.id
                ? 'bg-purple-950/35 border-purple-500/70 shadow-[0_0_18px_rgba(147,51,234,0.16)]'
                : 'bg-white/[0.025] border-white/[0.06] hover:border-purple-500/50 hover:bg-white/[0.045]'
            }`}
          >
            {currentSong?.id === song.id && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-purple-400" />}
            <p className="text-sm text-white truncate font-semibold pl-1">{song.title || 'Sem título'}</p>
            <div className="flex items-center justify-between mt-1 pl-1">
              <p className="text-[10px] text-gray-500 truncate">{currentProject?.title ?? 'Projeto'}</p>
              <span className="text-[9px] uppercase tracking-wider text-gray-600 group-hover:text-purple-300 transition">abrir</span>
            </div>
          </button>
        ))}
      </div>

      <div className="px-3.5 py-3 border-t border-white/[0.06]">
        <div className="h-14 rounded-md border border-white/[0.06] bg-black/30 px-2 py-2 flex items-end gap-1 overflow-hidden">
          {Array.from({ length: 28 }).map((_, index) => {
            const height = 16 + ((index * 13) % 34)
            return (
              <span
                key={index}
                className="flex-1 rounded-full bg-gradient-to-t from-purple-700 to-cyan-300 opacity-70"
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
          <span>BPM</span>
          <span className="font-mono text-gray-200">128</span>
          <span className="text-purple-300">A#m</span>
        </div>
      </div>
    </aside>
  )
}
