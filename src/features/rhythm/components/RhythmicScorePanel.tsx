import { useMemo, useState, type CSSProperties } from 'react'
import { mapLineToRhythm, type RhythmLineMap, type RhythmPocket, type RhythmSyllable } from '../rhythmMapping'

interface RhythmicScorePanelProps {
  lines: string[]
  bpm: number
  startBarIndex?: number
  activeBarIndex?: number
  playing?: boolean
}

type SlotOverrides = Record<string, number>
type ScoreViewMode = 'compact' | 'detail'
type RhythmInsight = {
  label: string
  hint: string
  className: 'low' | 'cool' | 'good' | 'hot'
}

const POCKETS: Array<{ id: RhythmPocket; label: string; hint: string; markers: string[] }> = [
  {
    id: 'straight16',
    label: 'Reto 1/16',
    hint: 'Semicolcheias retas para rap cadenciado e boombap.',
    markers: ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'],
  },
  {
    id: 'triplet',
    label: 'Triple Flow',
    hint: 'Trinca por tempo, pocket usado em trap/Migos flow.',
    markers: ['1', 'tri', 'let', '2', 'tri', 'let', '3', 'tri', 'let', '4', 'tri', 'let'],
  },
]

function getOverrideKey(lineIndex: number, syllableId: string): string {
  return `${lineIndex}:${syllableId}`
}

function getSlotFromPointer(clientX: number, element: HTMLElement, slotsPerBar: number): number {
  const rect = element.getBoundingClientRect()
  const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left))
  return Math.max(0, Math.min(slotsPerBar - 1, Math.round((relativeX / rect.width) * (slotsPerBar - 1))))
}

function buildLineOverrides(overrides: SlotOverrides, lineIndex: number): Record<string, number> {
  return Object.entries(overrides).reduce<Record<string, number>>((acc, [key, slot]) => {
    const prefix = `${lineIndex}:`
    if (key.startsWith(prefix)) acc[key.slice(prefix.length)] = slot
    return acc
  }, {})
}

function EmptyScore() {
  return (
    <div className="rhythm-empty">
      <div className="rhythm-empty-icon">FLOW</div>
      <p>Digite algumas barras para ver onde suas silabas caem no beat, onde sobra respiro e onde o flow fica cheio.</p>
    </div>
  )
}

function BeatHeader({ markers }: { markers: string[] }) {
  return (
    <div className="rhythm-beat-header">
      <div className="rhythm-header-spacer">BAR</div>
      <div className="rhythm-header-grid" style={{ '--rhythm-slots': markers.length } as CSSProperties}>
        {markers.map((marker, index) => (
          <span key={`${marker}-${index}`} className={/^\d$/.test(marker) ? 'strong' : ''}>
            {marker}
          </span>
        ))}
      </div>
    </div>
  )
}

function GridSlots({ slotsPerBar, beatStep }: { slotsPerBar: number; beatStep: number }) {
  return (
    <div className="rhythm-grid-slots" aria-hidden="true">
      {Array.from({ length: slotsPerBar }).map((_, slot) => (
        <span
          key={slot}
          className={slot % beatStep === 0 ? 'rhythm-grid-slot strong' : 'rhythm-grid-slot'}
        />
      ))}
    </div>
  )
}

function getLineDensity(syllableCount: number): { label: string; className: string } {
  if (syllableCount >= 15) return { label: 'cheio', className: 'hot' }
  if (syllableCount >= 10) return { label: 'pocket', className: 'good' }
  if (syllableCount >= 5) return { label: 'leve', className: 'cool' }
  return { label: 'vazio', className: 'low' }
}

function getRhythmInsight(map: RhythmLineMap): RhythmInsight {
  const count = map.syllables.length
  const strongHits = map.syllables.filter(note => note.startsBeat).length
  const strongRatio = count > 0 ? strongHits / count : 0

  if (count >= 15) {
    return {
      label: 'cheio',
      hint: 'Muita silaba na barra. Pode pedir double time, corte de palavra ou pausa marcada.',
      className: 'hot',
    }
  }

  if (count <= 4) {
    return {
      label: 'respiro',
      hint: 'Poucas silabas. Bom para pausa, resposta, ad-lib ou entrada antes da proxima barra.',
      className: 'cool',
    }
  }

  if (strongRatio >= 0.38) {
    return {
      label: 'ancorado',
      hint: 'Varias silabas caem em tempos fortes. Tende a soar firme e facil de seguir.',
      className: 'good',
    }
  }

  return {
    label: 'solto',
    hint: 'As silabas ficam mais entre os tempos. Pode soar mais swingado ou mais dificil de encaixar.',
    className: 'low',
  }
}

function SyllableNote({
  lineIndex,
  note,
  slotsPerBar,
  collapsed,
  onMove,
}: {
  lineIndex: number
  note: RhythmSyllable
  slotsPerBar: number
  collapsed: boolean
  onMove: (lineIndex: number, note: RhythmSyllable, slot: number) => void
}) {
  if (collapsed) return null

  return (
    <button
      type="button"
      className={`rhythm-note ${note.startsBeat ? 'strong' : ''}`}
      style={{
        left: `calc(${(note.slot / slotsPerBar) * 100}% + 2px)`,
        width: `calc(${(note.durationSlots / slotsPerBar) * 100}% - 4px)`,
      }}
      title={`${note.word} - slot ${note.slot + 1} (${note.timeMs}ms)`}
      onPointerDown={(event) => {
        const track = event.currentTarget.parentElement
        if (!track) return

        const slotsPerBar = Number(track.dataset.slotsPerBar || 16)
        event.currentTarget.setPointerCapture(event.pointerId)
        onMove(lineIndex, note, getSlotFromPointer(event.clientX, track, slotsPerBar))

        const handleMove = (moveEvent: PointerEvent) => {
          onMove(lineIndex, note, getSlotFromPointer(moveEvent.clientX, track, slotsPerBar))
        }

        const handleUp = () => {
          window.removeEventListener('pointermove', handleMove)
          window.removeEventListener('pointerup', handleUp)
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
      }}
    >
      <span>{note.text}</span>
    </button>
  )
}

function RhythmLine({
  displayIndex,
  sourceIndex,
  map,
  active,
  mode,
  playing,
  collapsed,
  onMove,
}: {
  displayIndex: number
  sourceIndex: number
  map: RhythmLineMap
  active: boolean
  mode: ScoreViewMode
  playing: boolean
  collapsed: boolean
  onMove: (lineIndex: number, note: RhythmSyllable, slot: number) => void
}) {
  const filledSlots = new Set(map.syllables.map(note => note.slot))
  const density = getLineDensity(map.syllables.length)
  const insight = getRhythmInsight(map)
  const beatStep = map.pocket === 'triplet' ? 3 : 4

  return (
    <div className={`rhythm-line ${active ? 'is-active' : ''} is-${density.className}`} title={insight.hint}>
      <div className="rhythm-line-meta">
        <small>barra</small>
        <span>{String(displayIndex + 1).padStart(2, '0')}</span>
        {!collapsed && <small className={`rhythm-line-insight is-${insight.className}`}>{mode === 'detail' ? `${map.syllables.length} sil.` : insight.label}</small>}
      </div>

      {!collapsed && mode === 'detail' && (
        <div className="rhythm-track" data-slots-per-bar={map.slotsPerBar} style={{ '--rhythm-slots': map.slotsPerBar } as CSSProperties}>
          <GridSlots slotsPerBar={map.slotsPerBar} beatStep={beatStep} />
          {playing && <span className="rhythm-playhead" />}
          <div className="rhythm-breath-row" aria-hidden="true">
            {Array.from({ length: map.slotsPerBar }).map((_, slot) => (
              <span key={slot} className={!filledSlots.has(slot) ? 'breath' : ''} />
            ))}
          </div>
          {map.syllables.map(note => (
            <SyllableNote
              key={note.id}
              lineIndex={sourceIndex}
              note={note}
              slotsPerBar={map.slotsPerBar}
              collapsed={collapsed}
              onMove={onMove}
            />
          ))}
        </div>
      )}

      {!collapsed && mode === 'compact' && (
        <div className="rhythm-compact-track" style={{ '--rhythm-slots': map.slotsPerBar } as CSSProperties}>
          <GridSlots slotsPerBar={map.slotsPerBar} beatStep={beatStep} />
          {playing && <span className="rhythm-playhead" />}
          <div className="rhythm-compact-notes">
            {map.syllables.map(note => (
              <span
                key={note.id}
                className={note.startsBeat ? 'strong' : ''}
                style={{
                  gridColumn: `${note.slot + 1} / span ${Math.max(1, note.durationSlots)}`,
                }}
                title={`${note.text} - slot ${note.slot + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RhythmLegend() {
  return (
    <div className="rhythm-legend">
      <span><b className="is-strong" />Tempo forte</span>
      <span><b className="is-note" />Silaba/ataque vocal</span>
      <span><b className="is-breath" />Espaco de respiro</span>
      <span><b className="is-playhead" />Beat tocando</span>
    </div>
  )
}

function FlowMapGuideModal({
  lines,
  selectedPocket,
  onClose,
  onSetMode,
}: {
  lines: Array<{ sourceIndex: number; map: RhythmLineMap }>
  selectedPocket: { label: string; hint: string; markers: string[] }
  onClose: () => void
  onSetMode: (mode: ScoreViewMode) => void
}) {
  const demoLine = lines[0]?.map ?? mapLineToRhythm('no corre da noite eu vim buscar meu placo', 128)
  const insights = lines.map(line => getRhythmInsight(line.map))
  const fullBars = insights.filter(item => item.className === 'hot').length
  const breathBars = insights.filter(item => item.className === 'cool').length
  const anchoredBars = insights.filter(item => item.className === 'good').length

  return (
    <div className="flow-guide-backdrop" role="dialog" aria-modal="true" aria-label="Guia do Mapa de Flow">
      <div className="flow-guide-modal">
        <header className="flow-guide-header">
          <div>
            <p className="flow-guide-kicker">Guia visual</p>
            <h2>Mapa de Flow</h2>
            <p>Uma tela simples para entender onde sua letra respira, acelera e encaixa no beat.</p>
          </div>
          <button type="button" onClick={onClose} className="flow-guide-close">Fechar</button>
        </header>

        <div className="flow-guide-body editor-scroll">
          <section className="flow-guide-hero">
            <div>
              <p className="flow-guide-label">Ideia principal</p>
              <h3>Nao e partitura. E um raio-x do pocket.</h3>
              <p>
                Cada linha representa uma barra da letra. Os blocos coloridos mostram ataques vocais:
                silabas ou pedacos de palavra que provavelmente caem no compasso.
              </p>
            </div>
            <div className="flow-guide-summary">
              <span>{lines.length || 1} barras lidas</span>
              <span>{selectedPocket.label}</span>
              <span>{anchoredBars} ancoradas</span>
              <span>{fullBars} cheias</span>
              <span>{breathBars} com respiro</span>
            </div>
          </section>

          <section className="flow-guide-section">
            <p className="flow-guide-label">Como ler em 4 passos</p>
            <div className="flow-guide-steps">
              <div><strong>1</strong><span>Leia da esquerda para direita como se fosse um compasso.</span></div>
              <div><strong>2</strong><span>As linhas verticais mais fortes sao os tempos: 1, 2, 3 e 4.</span></div>
              <div><strong>3</strong><span>Os blocos coloridos sao entradas vocais. Muitos blocos juntos indicam barra cheia.</span></div>
              <div><strong>4</strong><span>Espacos vazios sao lugares bons para respirar, pausar ou deixar bounce.</span></div>
            </div>
          </section>

          <section className="flow-guide-section">
            <div className="flow-guide-section-head">
              <div>
                <p className="flow-guide-label">Exemplo visual</p>
                <h3>{demoLine.lineText}</h3>
              </div>
              <span>{selectedPocket.hint}</span>
            </div>
            <div className="flow-guide-demo">
              <BeatHeader markers={selectedPocket.markers} />
              <RhythmLine
                displayIndex={0}
                sourceIndex={0}
                map={demoLine}
                active
                mode="detail"
                playing={false}
                collapsed={false}
                onMove={() => {}}
              />
            </div>
          </section>

          <section className="flow-guide-grid">
            <div className="flow-guide-card">
              <p className="flow-guide-label">Diagnosticos</p>
              <ul>
                <li><b>respiro</b> pouca silaba, bom para pausa ou resposta.</li>
                <li><b>solto</b> mais swingado, pode exigir mais interpretacao.</li>
                <li><b>ancorado</b> cai bem nos tempos fortes, tende a ser facil de cantar.</li>
                <li><b>cheio</b> muita informacao, pode precisar cortar ou acelerar.</li>
              </ul>
            </div>
            <div className="flow-guide-card">
              <p className="flow-guide-label">O que fazer</p>
              <ul>
                <li>Use <b>Ler</b> para entender o desenho geral sem mexer em nada.</li>
                <li>Use <b>Ajustar</b> para arrastar silabas e testar outro encaixe.</li>
                <li>Troque o pocket para comparar rap reto com triple flow.</li>
                <li>Se a barra estiver cheia, tente remover palavra fraca ou criar pausa.</li>
              </ul>
            </div>
          </section>
        </div>

        <footer className="flow-guide-footer">
          <button type="button" onClick={() => { onSetMode('compact'); onClose() }}>Voltar lendo</button>
          <button type="button" onClick={() => { onSetMode('detail'); onClose() }} className="primary">Abrir modo Ajustar</button>
        </footer>
      </div>
    </div>
  )
}

export function RhythmicScorePanel({
  lines,
  bpm,
  startBarIndex = 0,
  activeBarIndex = startBarIndex,
  playing = false,
}: RhythmicScorePanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<ScoreViewMode>('compact')
  const [pocket, setPocket] = useState<RhythmPocket>('straight16')
  const [showHelp, setShowHelp] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [overrides, setOverrides] = useState<SlotOverrides>({})
  const selectedPocket = POCKETS.find(item => item.id === pocket) ?? POCKETS[0]

  const rhythmLines = useMemo(() => {
    return lines
      .map((line, lineIndex) => ({
        sourceIndex: startBarIndex + lineIndex,
        map: mapLineToRhythm(line, bpm, undefined, buildLineOverrides(overrides, startBarIndex + lineIndex), pocket),
      }))
      .filter(line => line.map.lineText.trim().length > 0)
  }, [lines, bpm, overrides, startBarIndex, pocket])

  const totalSyllables = rhythmLines.reduce((sum, line) => sum + line.map.syllables.length, 0)
  const averageSyllables = rhythmLines.length > 0
    ? Math.round((totalSyllables / rhythmLines.length) * 10) / 10
    : 0

  function handleMove(lineIndex: number, note: RhythmSyllable, slot: number) {
    setOverrides(prev => ({
      ...prev,
      [getOverrideKey(lineIndex, note.id)]: slot,
    }))
  }

  return (
    <aside
      data-onboarding="rhythm-panel"
      className={`rhythm-panel ${collapsed ? 'is-collapsed' : ''} ${playing ? 'is-playing' : ''} is-${mode}`}
      style={{ '--rhythm-bar-ms': `${(60000 / Math.max(bpm, 1)) * 4}ms` } as CSSProperties}
    >
      <button
        type="button"
        className="rhythm-collapse-btn"
        onClick={() => setCollapsed(value => !value)}
        title={collapsed ? 'Expandir Mapa de Flow' : 'Recolher Mapa de Flow'}
      >
        {collapsed ? '^' : 'v'}
      </button>

      <div className="rhythm-panel-header">
        <div>
          <p className="rhythm-kicker">Mapa de Flow</p>
          {!collapsed && (
            <>
              <h2>Bloco {Math.floor(startBarIndex / 4) + 1}</h2>
              <p className="rhythm-subtitle">Onde sua letra cai no beat antes de gravar.</p>
            </>
          )}
        </div>
        {!collapsed && (
          <div className="rhythm-header-actions">
            <button
              type="button"
              className="rhythm-help-btn"
              onClick={() => setShowHelp(value => !value)}
              title="Entender o Mapa de Flow"
            >
              ?
            </button>
            <button
              type="button"
              className="rhythm-open-guide-btn"
              onClick={() => setShowGuide(true)}
              title="Abrir guia completo do Mapa de Flow"
            >
              Guia
            </button>
            <div className="rhythm-view-toggle" role="group" aria-label="Modo do Mapa de Flow">
              <button
                type="button"
                className={mode === 'compact' ? 'active' : ''}
                onClick={() => setMode('compact')}
              >
                Ler
              </button>
              <button
                type="button"
                className={mode === 'detail' ? 'active' : ''}
                onClick={() => setMode('detail')}
              >
                Ajustar
              </button>
            </div>
            <div className="rhythm-pocket-toggle" role="group" aria-label="Pocket rítmico">
              {POCKETS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={pocket === item.id ? 'active' : ''}
                  title={item.hint}
                  onClick={() => setPocket(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="rhythm-bpm-pill">
              <span>{bpm}</span>
              <small>BPM</small>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="rhythm-panel-stats">
          <span>{rhythmLines.length} barras</span>
          <span>{averageSyllables || '--'} sil/bar</span>
          <span>{playing ? 'tocando' : selectedPocket.label}</span>
        </div>
      )}

      {!collapsed && showHelp && (
        <div className="rhythm-help">
          <strong>Para que serve:</strong> o Mapa de Flow nao e uma regra musical; ele e um raio-x do pocket.
          Cada faixa mostra uma barra da letra, os riscos verticais sao os tempos do beat, e os blocos coloridos sao
          as silabas/ataques vocais. Use para descobrir onde acelerar, onde respirar e se a frase esta cheia demais.
        </div>
      )}

      {!collapsed && <RhythmLegend />}
      {!collapsed && <BeatHeader markers={selectedPocket.markers} />}

      <div className="rhythm-lines editor-scroll">
        {rhythmLines.length === 0 ? (
          <EmptyScore />
        ) : (
          rhythmLines.map(({ map, sourceIndex }, index) => {
            const absoluteIndex = startBarIndex + index
            return (
              <div key={`${sourceIndex}-${map.lineText}`} className="rhythm-line-wrap">
                {index % 4 === 0 && (
                  <div className="rhythm-block-label">
                    <span>Bloco {Math.floor(absoluteIndex / 4) + 1}</span>
                    <small>Compassos {absoluteIndex + 1}-{absoluteIndex + 4}</small>
                  </div>
                )}
                <RhythmLine
                  displayIndex={absoluteIndex}
                  sourceIndex={sourceIndex}
                  map={map}
                  active={absoluteIndex === activeBarIndex}
                  mode={mode}
                  playing={playing}
                  collapsed={collapsed}
                  onMove={handleMove}
                />
              </div>
            )
          })
        )}
      </div>

      {showGuide && (
        <FlowMapGuideModal
          lines={rhythmLines}
          selectedPocket={selectedPocket}
          onClose={() => setShowGuide(false)}
          onSetMode={setMode}
        />
      )}
    </aside>
  )
}
