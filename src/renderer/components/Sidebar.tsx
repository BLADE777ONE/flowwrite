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
    <div className="w-72 bg-[#131317] border-r border-[#262631] p-4 flex flex-col">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-200 font-black">
            F
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">FlowWriter</h1>
            <p className="text-[10px] text-cyan-400 uppercase tracking-[0.22em] font-bold">Studio</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-[#2b2b36] bg-[#19191f] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Projeto</p>
            <p className="text-xs text-gray-200 truncate mt-0.5">{currentProject?.title ?? 'Sem projeto'}</p>
          </div>
          <div className="rounded-md border border-[#2b2b36] bg-[#19191f] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Letras</p>
            <p className="text-xs text-gray-200 mt-0.5">{songs.length}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onNewLyric}
        className="bg-purple-600 hover:bg-purple-500 text-white py-2.5 px-4 rounded-md mb-4 transition font-semibold shadow-[0_0_24px_rgba(124,58,237,0.18)]"
      >
        + Nova Letra
      </button>
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">Letras Salvas</p>
        {songs.length === 0 && (
          <p className="text-xs text-gray-600 mt-2">Nenhuma letra ainda. Clique em + Nova Letra.</p>
        )}
        {songs.map(song => (
          <div
            key={song.id}
            onClick={() => onSelectSong(song)}
            className={`group p-3 rounded-md cursor-pointer border transition mb-2 relative overflow-hidden ${currentSong?.id === song.id ? 'bg-purple-950/35 border-purple-500/70' : 'bg-[#19191f] border-[#2b2b36] hover:border-purple-500/60 hover:bg-[#1e1e27]'}`}
          >
            {currentSong?.id === song.id && <div className="absolute left-0 top-0 h-full w-1 bg-purple-500" />}
            <p className="text-sm text-white truncate font-medium">{song.title || 'Sem título'}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500 truncate">{currentProject?.title ?? 'Projeto'}</p>
              <span className="text-[10px] text-gray-600 group-hover:text-purple-300 transition">abrir</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
