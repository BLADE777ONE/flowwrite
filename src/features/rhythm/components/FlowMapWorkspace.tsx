import { useMemo } from 'react'
import { RhythmicScorePanel } from './RhythmicScorePanel'

interface FlowMapWorkspaceProps {
  title: string
  lines: string[]
  bpm: number
  activeBarIndex: number
  playing: boolean
  onClose: () => void
}

export function FlowMapWorkspace({
  title,
  lines,
  bpm,
  activeBarIndex,
  playing,
  onClose,
}: FlowMapWorkspaceProps) {
  const lyricLines = useMemo(() => lines.map(line => line.trim()).filter(Boolean), [lines])
  const activeLineIndex = Math.min(activeBarIndex, Math.max(lyricLines.length - 1, 0))

  return (
    <div className="flow-map-page" role="dialog" aria-modal="true" aria-label="Mapa de Flow">
      <div className="flow-map-shell">
        <header className="flow-map-topbar">
          <div>
            <p className="flow-map-kicker">Timeline de partitura</p>
            <h1>Mapa de Flow</h1>
            <span>{title || 'Sem titulo'} - {bpm} BPM</span>
          </div>
          <button type="button" onClick={onClose}>Voltar para escrever</button>
        </header>

        <main className="flow-map-content">
          <section className="flow-map-tool">
            <RhythmicScorePanel
              lines={lyricLines}
              bpm={bpm}
              startBarIndex={0}
              activeBarIndex={activeLineIndex}
              playing={playing}
              showLineText
              initialMode="detail"
            />
          </section>
        </main>
      </div>
    </div>
  )
}
