// src/renderer/App.tsx
import { useEffect } from 'react'
import { ProjectSidebar } from '../features/projects/components/ProjectSidebar'
import { CoreEditor } from '../features/editor/components/CoreEditor'
import { RightAnalysisPanel } from '../features/analysis/components/RightAnalysisPanel'
import { BottomStatsBar } from '../features/analysis/components/BottomStatsBar'
import { useProjectStore } from '../features/projects/projectStore'
import { useEditorStore } from '../features/editor/editorStore'

declare global {
  interface Window {
    flowAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string) => void
    }
    appInfo: { platform: string }
  }
}

export default function App() {
  const { setProjects, setIsLoading } = useProjectStore()
  const { rightPanelCollapsed, toggleRightPanel } = useEditorStore()

  useEffect(() => {
    async function loadProjects() {
      setIsLoading(true)
      try {
        const projects = await window.flowAPI.invoke('project:list')
        setProjects(projects as any[])
      } catch (err) {
        console.error('Erro ao carregar projetos:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProjects()
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-studio-bg">
      {/* Linha de acento — gradiente topo */}
      <div className="h-[2px] flex-shrink-0 bg-gradient-accent opacity-80" />

      {/* Titlebar drag area */}
      <div
        className="h-8 flex-shrink-0 flex items-center px-4 select-none"
        style={{
          WebkitAppRegion: 'drag',
          background: 'linear-gradient(180deg, rgba(13,13,26,0.95) 0%, rgba(7,7,15,0.9) 100%)',
        } as React.CSSProperties}
      >
        {/* Logo inline na titlebar */}
        <div className="flex items-center gap-2 pointer-events-none">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
          >
            <span className="text-[10px]">🎵</span>
          </div>
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{
              background: 'linear-gradient(90deg, #c084fc, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            FlowWriter Studio
          </span>
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar esquerda */}
        <aside
          className="w-[220px] flex-shrink-0 overflow-hidden"
          style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.6)' }}
        >
          <ProjectSidebar />
        </aside>

        {/* Editor central — fundo claro */}
        <main className="flex-1 overflow-hidden relative" style={{ background: '#f9f8f5' }}>
          <CoreEditor />

          {/* Botão de colapsar/expandir painel direito */}
          <button
            onClick={toggleRightPanel}
            title={rightPanelCollapsed ? 'Mostrar análise' : 'Esconder análise'}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              width: 18,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(13,13,26,0.85)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRight: 'none',
              borderRadius: '6px 0 0 6px',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(13,13,26,0.85)')}
          >
            <span style={{
              color: 'rgba(192,132,252,0.85)',
              fontSize: 10,
              lineHeight: 1,
              fontWeight: 700,
              transition: 'transform 0.25s',
              display: 'inline-block',
              transform: rightPanelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>‹</span>
          </button>
        </main>

        {/* Painel de análise direito — recolhível */}
        <aside
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: rightPanelCollapsed ? 0 : 280,
            transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: rightPanelCollapsed ? 'none' : '-4px 0 32px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ width: 280, height: '100%' }}>
            <RightAnalysisPanel />
          </div>
        </aside>
      </div>

      {/* Bottom stats bar */}
      <BottomStatsBar />
    </div>
  )
}
