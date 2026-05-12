// src/features/projects/components/ProjectSidebar.tsx
import { useState } from 'react'
import { useProjectStore } from '../projectStore'
import { useEditorStore } from '../../editor/editorStore'
import { Project } from '../../../shared/types/Project'
import { Song } from '../../../shared/types/Song'

const VIBES: { id: string; label: string; color: string }[] = [
  { id: 'trap',       label: 'Trap',       color: '#a855f7' },
  { id: 'drill',      label: 'Drill',      color: '#ef4444' },
  { id: 'boombap',    label: 'Boom Bap',   color: '#f59e0b' },
  { id: 'plug',       label: 'Plug',       color: '#22d3ee' },
  { id: 'funk',       label: 'Funk',       color: '#ec4899' },
  { id: 'melódico',   label: 'Melódico',   color: '#10b981' },
  { id: 'consciente', label: 'Consciente', color: '#a3e635' },
]

export function ProjectSidebar() {
  const { projects, currentProject, songs, setCurrentProject, setSongs, addProject, setProjects } = useProjectStore()
  const { setCurrentSong, currentSong } = useEditorStore()
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectVibe, setNewProjectVibe] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function createProject() {
    if (!newProjectTitle.trim()) return
    try {
      const project = await window.flowAPI.invoke('project:create', {
        title: newProjectTitle.trim(),
        vibe: newProjectVibe || undefined,
      }) as Project
      addProject(project)
      setNewProjectTitle('')
      setNewProjectVibe('')
      setIsCreatingProject(false)
      await openProject(project)
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      alert('Erro ao criar projeto. Verifique o console.')
    }
  }

  async function openProject(project: Project) {
    setCurrentProject(project)
    setExpandedProject(project.id)
    const projectSongs = await window.flowAPI.invoke('lyric:list', project.id) as Song[]
    setSongs(projectSongs)
  }

  async function deleteProject(id: string) {
    await window.flowAPI.invoke('project:delete', id)
    setProjects(projects.filter(p => p.id !== id))
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCurrentSong(null)
    }
    setDeletingId(null)
  }

  async function createSong(projectId: string) {
    const song = await window.flowAPI.invoke('lyric:create', { projectId, title: 'Nova Letra' }) as Song
    setSongs([...songs, song])
    setCurrentSong(song)
  }

  async function openSong(song: Song) {
    const full = await window.flowAPI.invoke('lyric:get', song.id) as Song
    setCurrentSong(full)
  }

  async function deleteSong(songId: string) {
    await window.flowAPI.invoke('lyric:delete', songId)
    setSongs(songs.filter(s => s.id !== songId))
    if (currentSong?.id === songId) setCurrentSong(null)
  }

  async function exportTxt(songId: string) {
    await window.flowAPI.invoke('export:txt', songId)
  }

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className="h-full flex flex-col text-sm select-none"
      style={{ background: 'linear-gradient(180deg, #0d0d1a 0%, #09091a 100%)' }}
    >
      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs text-text-secondary placeholder-text-muted outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(124,58,237,0.4)'
              e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.08)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* ── Novo projeto ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 flex-shrink-0">
        {isCreatingProject ? (
          <div className="animate-fade-in space-y-2 p-2.5 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Nome do projeto..."
              value={newProjectTitle}
              onChange={e => setNewProjectTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createProject()
                if (e.key === 'Escape') { setIsCreatingProject(false); setNewProjectVibe('') }
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,58,237,0.3)' }}
            />
            {/* Vibe chips */}
            <div className="flex flex-wrap gap-1">
              {VIBES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setNewProjectVibe(v.id === newProjectVibe ? '' : v.id)}
                  className="vibe-pill"
                  style={{
                    backgroundColor: newProjectVibe === v.id ? `${v.color}25` : 'transparent',
                    color: newProjectVibe === v.id ? v.color : '#555575',
                    border: `1px solid ${newProjectVibe === v.id ? v.color + '50' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: newProjectVibe === v.id ? `0 0 8px ${v.color}30` : 'none',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={createProject}
                disabled={!newProjectTitle.trim()}
                className="studio-btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                Criar
              </button>
              <button
                onClick={() => { setIsCreatingProject(false); setNewProjectVibe('') }}
                className="studio-btn-ghost px-2.5"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingProject(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px dashed rgba(124,58,237,0.3)',
              color: 'rgba(168,85,247,0.8)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.15)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.5)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#c084fc'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.08)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.3)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(168,85,247,0.8)'
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo Projeto
          </button>
        )}
      </div>

      {/* ── Divisor ────────────────────────────────────────────────────────── */}
      <div className="mx-3 mb-2 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Label seção ────────────────────────────────────────────────────── */}
      <div className="px-4 mb-1.5 flex-shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-muted opacity-60">
          Projetos · {filteredProjects.length}
        </span>
      </div>

      {/* ── Lista de projetos ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}
            >
              🎤
            </div>
            <div>
              <p className="text-xs text-text-muted leading-relaxed">Nenhum projeto ainda.</p>
              <button
                onClick={() => setIsCreatingProject(true)}
                className="text-xs mt-1 transition-colors"
                style={{ color: 'rgba(168,85,247,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c084fc')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(168,85,247,0.8)')}
              >
                Criar o primeiro →
              </button>
            </div>
          </div>
        )}

        {filteredProjects.map(project => {
          const vibe = VIBES.find(v => v.id === project.vibe)
          const vibeColor = vibe?.color ?? '#555575'
          const isActive = currentProject?.id === project.id
          const isExpanded = expandedProject === project.id
          const projectSongs = songs.filter(s => s.projectId === project.id)
          const isDeleting = deletingId === project.id

          return (
            <div key={project.id} className="animate-slide-in">
              {/* Projeto */}
              <div
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'border'
                    : 'border border-transparent hover:border-white/5'
                }`}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${vibeColor}18 0%, ${vibeColor}08 100%)`,
                  borderColor: `${vibeColor}30`,
                  boxShadow: `0 0 16px ${vibeColor}10`,
                } : {}}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = ''
                }}
              >
                {/* Dot de vibe */}
                <button
                  onClick={() => openProject(project)}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300"
                    style={{
                      backgroundColor: isActive ? vibeColor : 'rgba(255,255,255,0.15)',
                      boxShadow: isActive ? `0 0 8px ${vibeColor}80` : 'none',
                    }}
                  />
                  <span className={`truncate text-xs font-medium transition-colors ${
                    isActive ? 'text-text-primary' : 'text-text-secondary'
                  }`}>
                    {project.title}
                  </span>
                </button>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Vibe badge */}
                  {vibe && (
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: `${vibeColor}20`, color: vibeColor }}
                    >
                      {vibe.label}
                    </span>
                  )}

                  {/* Contagem */}
                  <span className="text-[9px] text-text-muted font-mono w-3 text-center">
                    {projectSongs.length}
                  </span>

                  {/* Delete */}
                  {isDeleting ? (
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                      >✓</button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-[9px] px-1.5 py-0.5 rounded-md text-text-muted transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setDeletingId(project.id) }}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] text-text-muted hover:text-red-400 transition-all w-4 text-center"
                      title="Excluir projeto"
                    >×</button>
                  )}

                  {/* Expand */}
                  <button
                    onClick={() => openProject(project)}
                    className="text-[9px] text-text-muted transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >▸</button>
                </div>
              </div>

              {/* Letras do projeto */}
              {isExpanded && (
                <div className="ml-4 mt-0.5 mb-1 pl-2.5 space-y-0.5 animate-fade-in" style={{ borderLeft: `1px solid ${vibeColor}30` }}>
                  {projectSongs.length === 0 && (
                    <p className="text-[9px] text-text-muted px-2 py-1 italic opacity-60">Nenhuma letra</p>
                  )}
                  {projectSongs.map(song => {
                    const isCurrentSong = currentSong?.id === song.id
                    return (
                      <div key={song.id} className="flex items-center group/song">
                        <button
                          onClick={() => openSong(song)}
                          className={`flex-1 text-left px-2 py-1.5 text-[11px] truncate rounded-lg transition-all duration-150 ${
                            isCurrentSong
                              ? 'font-semibold'
                              : 'text-text-muted hover:text-text-secondary'
                          }`}
                          style={isCurrentSong ? {
                            background: `${vibeColor}15`,
                            color: vibeColor,
                          } : {}}
                        >
                          <span className="mr-1.5 opacity-40">♪</span>
                          {song.title}
                        </button>
                        <div className="opacity-0 group-hover/song:opacity-100 flex gap-0.5 pr-1 transition-opacity">
                          <button
                            onClick={() => exportTxt(song.id)}
                            className="text-[9px] px-1 py-0.5 text-text-muted hover:text-accent-cyan rounded transition-colors"
                            title="Exportar TXT"
                          >↓</button>
                          <button
                            onClick={() => deleteSong(song.id)}
                            className="text-[9px] px-1 py-0.5 text-text-muted hover:text-red-400 rounded transition-colors"
                            title="Excluir letra"
                          >×</button>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => createSong(project.id)}
                    className="w-full text-left px-2 py-1.5 text-[11px] rounded-lg transition-all duration-150"
                    style={{ color: `${vibeColor}80` }}
                    onMouseEnter={e => (e.currentTarget.style.color = vibeColor)}
                    onMouseLeave={e => (e.currentTarget.style.color = `${vibeColor}80`)}
                  >
                    + Nova Letra
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="text-[9px] text-text-muted text-center opacity-30 tracking-wider font-mono">
          {projects.length} projeto{projects.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
