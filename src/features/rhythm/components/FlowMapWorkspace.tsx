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

function getDensityLabel(line: string): { label: string; className: string; hint: string } {
  const words = line.trim().split(/\s+/).filter(Boolean).length

  if (words >= 13) {
    return {
      label: 'cheia',
      className: 'hot',
      hint: 'Pode pedir corte, pausa ou double time.',
    }
  }

  if (words <= 4) {
    return {
      label: 'respiro',
      className: 'cool',
      hint: 'Boa para pausa, resposta ou entrada.',
    }
  }

  return {
    label: 'encaixe',
    className: 'good',
    hint: 'Boa base para testar cantando.',
  }
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
  const activeLine = lyricLines[activeLineIndex] ?? ''
  const activeDensity = activeLine ? getDensityLabel(activeLine) : null

  return (
    <div className="flow-map-page" role="dialog" aria-modal="true" aria-label="Mapa de Flow">
      <div className="flow-map-shell">
        <header className="flow-map-topbar">
          <div>
            <p className="flow-map-kicker">Ferramenta separada</p>
            <h1>Mapa de Flow</h1>
            <span>{title || 'Sem titulo'} - {bpm} BPM</span>
          </div>
          <button type="button" onClick={onClose}>Voltar para escrever</button>
        </header>

        <main className="flow-map-content">
          <section className="flow-map-lyrics">
            <div className="flow-map-section-head">
              <div>
                <p className="flow-map-kicker">Letra ampliada</p>
                <h2>Cante olhando barra por barra</h2>
              </div>
              <span>{lyricLines.length || 0} barras</span>
            </div>

            <div className="flow-map-line-list editor-scroll">
              {lyricLines.length === 0 ? (
                <div className="flow-map-empty">
                  Escreva algumas barras no editor para estudar o flow aqui.
                </div>
              ) : (
                lyricLines.map((line, index) => {
                  const density = getDensityLabel(line)
                  return (
                    <div
                      key={`${line}-${index}`}
                      className={`flow-map-line ${index === activeLineIndex ? 'is-active' : ''}`}
                    >
                      <span className="flow-map-line-number">{String(index + 1).padStart(2, '0')}</span>
                      <p>{line}</p>
                      <strong className={`is-${density.className}`}>{density.label}</strong>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="flow-map-tool">
            <div className="flow-map-reading">
              <p className="flow-map-kicker">Leitura simples</p>
              {activeDensity ? (
                <>
                  <h2>Barra atual: <span className={`is-${activeDensity.className}`}>{activeDensity.label}</span></h2>
                  <p>{activeDensity.hint}</p>
                </>
              ) : (
                <>
                  <h2>Sem barras ainda</h2>
                  <p>Quando houver texto, esta area mostra se a barra esta leve, encaixada ou cheia.</p>
                </>
              )}
            </div>

            <div className="flow-map-simple-guide">
              <div><strong>1</strong><span>Escreva no editor principal.</span></div>
              <div><strong>2</strong><span>Abra o Mapa para estudar o encaixe.</span></div>
              <div><strong>3</strong><span>Volte e ajuste a letra.</span></div>
            </div>

            <RhythmicScorePanel
              lines={lyricLines}
              bpm={bpm}
              startBarIndex={0}
              activeBarIndex={activeLineIndex}
              playing={playing}
            />
          </section>
        </main>
      </div>
    </div>
  )
}
