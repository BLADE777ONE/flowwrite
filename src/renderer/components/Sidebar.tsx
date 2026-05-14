import { useState } from 'react'
import { useEditorStore } from '../../features/editor/editorStore'
import type { Project, Song } from '../types'

const KNOWLEDGE_TOPICS = [
  {
    title: 'O que e metrica?',
    body: 'E a quantidade e distribuicao das silabas nas barras. No rap, ela ajuda a frase caber no beat sem atropelar nem sobrar demais.',
  },
  {
    title: 'O que e flow?',
    body: 'E o jeito que a letra anda no ritmo: pausas, velocidade, acentos, swing e como voce encaixa a voz entre bumbo, caixa e hi-hat.',
  },
  {
    title: 'Como criar triple flow?',
    body: 'Pense em 3 pulsos dentro do tempo: ta-ta-ta. Use grupos curtos, repeticao sonora e pausas pequenas para gerar bounce.',
  },
  {
    title: 'Para que serve a partitura?',
    body: 'Ela nao manda cantar exatamente igual. Ela mostra uma leitura visual do pocket para testar encaixe, respiro e deslocamentos.',
  },
]

interface SidebarProps {
  projects: Project[]
  songs: Song[]
  currentProject: Project | null
  currentSong: Song | null
  onNewLyric: () => void
  onSelectSong: (song: Song) => void
  onSelectProject: (project: Project) => void
  onNewProject: () => void
  onRenameProject: (id: string, title: string) => void
  onDeleteProject: (id: string) => void
  audioName: string | null
  audioPath: string | null
  audioUrl: string | null
  onAttachAudio: () => void
}

function ProjectItem({
  project,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  project: Project
  isActive: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.title)

  function commitRename() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== project.title) onRename(trimmed)
    else setDraft(project.title)
  }

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition mb-0.5 border ${
        isActive
          ? 'bg-purple-950/45 border-purple-500/60 shadow-[0_0_14px_rgba(147,51,234,0.14)]'
          : 'border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
      }`}
      onClick={() => { if (!editing) onSelect() }}
    >
      <span
        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all ${
          isActive
            ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
            : 'bg-white/20 group-hover:bg-white/35'
        }`}
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditing(false); setDraft(project.title) }
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent text-xs text-white outline-none border-b border-purple-500/60 pb-px"
        />
      ) : (
        <span className={`flex-1 min-w-0 text-xs truncate font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
          {project.title}
        </span>
      )}

      <span className="text-[9px] text-cyan-300 font-mono flex-shrink-0 tabular-nums">
        {String(project._count?.songs ?? 0).padStart(2, '0')}
      </span>

      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setEditing(true); setDraft(project.title) }}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-white hover:bg-white/[0.08] transition text-[11px]"
            title="Renomear"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition text-[13px]"
            title="Excluir projeto"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  projects,
  songs,
  currentProject,
  currentSong,
  onNewLyric,
  onSelectSong,
  onSelectProject,
  onNewProject,
  onRenameProject,
  onDeleteProject,
  audioName,
  audioPath,
  audioUrl,
  onAttachAudio,
}: SidebarProps) {
  const { bpm } = useEditorStore()
  const audioSrc = audioUrl ?? (audioPath ? `obloco-audio://beat/play?path=${encodeURIComponent(audioPath)}` : undefined)
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)

  return (
    <aside
      data-onboarding="sidebar"
      className="w-60 bg-[#08080c] border-r border-white/[0.07] flex flex-col shadow-[12px_0_36px_rgba(0,0,0,0.22)]"
    >

      {/* Logo */}
      <div className="px-3.5 pt-3.5 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg border border-cyan-400/35 bg-[#101018] flex items-center justify-center shadow-[0_0_22px_rgba(0,229,255,0.13)]">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6 text-cyan-300">
              <rect x="7" y="5" width="18" height="22" rx="3" fill="currentColor" opacity="0.12" />
              <rect x="9" y="7" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 12h8M12 16h6M12 20h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M24 10h2M24 14h2M24 18h2" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-black text-white leading-tight tracking-tight">OBloco</h1>
            <p className="text-[9px] text-cyan-300 uppercase tracking-[0.18em] font-black">Rhyme Studio</p>
          </div>
        </div>
      </div>

      {/* Projetos */}
      <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500 font-bold">Projetos</p>
          <button
            type="button"
            onClick={onNewProject}
            className="h-5 w-5 flex items-center justify-center rounded border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-white hover:border-purple-500/50 transition text-sm font-bold"
            title="Novo projeto"
          >
            +
          </button>
        </div>

        <div className="max-h-40 overflow-y-auto editor-scroll -mx-1 px-1">
          {projects.length === 0 ? (
            <p className="text-xs text-gray-600 py-1 pl-1">Nenhum projeto ainda.</p>
          ) : (
            projects.map(project => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={currentProject?.id === project.id}
                onSelect={() => onSelectProject(project)}
                onRename={title => onRenameProject(project.id, title)}
                onDelete={() => onDeleteProject(project.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Nova Letra */}
      <div className="px-3.5 py-3 border-b border-white/[0.06]">
        <button
          onClick={onNewLyric}
          disabled={!currentProject}
          className="w-full bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded-md transition font-bold text-sm shadow-[0_0_24px_rgba(147,51,234,0.28)]"
        >
          + Nova Letra
        </button>
      </div>

      {/* Letras do projeto atual */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] mb-2 font-bold">
          {currentProject ? (
            <>Sessões · <span className="text-purple-300">{currentProject.title}</span></>
          ) : 'Sessões'}
        </p>

        {songs.length === 0 && (
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            {currentProject ? 'Nenhuma letra ainda. Clique em + Nova Letra.' : 'Selecione um projeto.'}
          </p>
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
            {currentSong?.id === song.id && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-purple-400" />
            )}
            <p className="text-sm text-white truncate font-semibold pl-1">{song.title || 'Sem título'}</p>
            <div className="flex items-center justify-between mt-1 pl-1">
              <p className="text-[10px] text-gray-500 truncate">{currentProject?.title ?? 'Projeto'}</p>
              <span className="text-[9px] uppercase tracking-wider text-gray-600 group-hover:text-purple-300 transition">
                abrir
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Conhecimento */}
      <div className="px-3.5 py-3 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => setKnowledgeOpen(value => !value)}
          className="flex w-full items-center justify-between rounded-md border border-cyan-500/20 bg-cyan-500/[0.08] px-3 py-2 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
        >
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-300 font-black">Conhecimento</p>
            <p className="mt-0.5 text-[10px] text-gray-500">Metrica, flow e escrita</p>
          </div>
          <span className="font-mono text-xs text-cyan-300">{knowledgeOpen ? '-' : '+'}</span>
        </button>

        {knowledgeOpen && (
          <div className="mt-2 max-h-44 space-y-2 overflow-y-auto editor-scroll rounded-md border border-white/[0.06] bg-black/25 p-2">
            {KNOWLEDGE_TOPICS.map(topic => (
              <div key={topic.title} className="rounded border border-white/[0.06] bg-white/[0.025] p-2">
                <p className="text-[11px] font-bold text-white">{topic.title}</p>
                <p className="mt-1 text-[10px] leading-snug text-gray-500">{topic.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Beat de referencia */}
      <div className="px-3.5 py-3 border-t border-white/[0.06]">
        <div className="rounded-md border border-white/[0.06] bg-black/30 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-300 font-black">Beat</p>
              <p className="mt-1 truncate text-[10px] text-gray-400">
                {audioName ?? 'Nenhum audio anexado'}
              </p>
            </div>
            <button
              type="button"
              onClick={onAttachAudio}
              className="rounded border border-purple-500/40 bg-purple-600/20 px-2 py-1 text-[10px] font-black text-purple-100 transition hover:bg-purple-600/35"
              title="Anexar beat de referencia"
            >
              Anexar
            </button>
          </div>

          {audioName ? (
            <audio
              key={audioSrc}
              className="mt-2 h-8 w-full"
              controls
              preload="metadata"
              src={audioSrc}
            />
          ) : (
            <div className="mt-2 h-10 rounded border border-dashed border-white/[0.08] bg-white/[0.02] px-2 py-2">
              <p className="text-[10px] leading-snug text-gray-600">
                Coloque o beat da letra aqui para escrever ouvindo a referencia.
              </p>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
          <span>BPM</span>
          <span className="font-mono text-gray-200">{bpm}</span>
          <span className="text-purple-300">A#m</span>
        </div>
      </div>
    </aside>
  )
}
