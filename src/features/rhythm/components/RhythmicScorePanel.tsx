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
      <div className="rhythm-empty-icon">16</div>
      <p>Digite algumas barras para desenhar o encaixe rítmico.</p>
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
  const beatStep = map.pocket === 'triplet' ? 3 : 4

  return (
    <div className={`rhythm-line ${active ? 'is-active' : ''} is-${density.className}`}>
      <div className="rhythm-line-meta">
        <small>BAR</small>
        <span>{String(displayIndex + 1).padStart(2, '0')}</span>
        {!collapsed && <small>{mode === 'detail' ? `${Math.round(map.barDurationMs)}ms` : density.label}</small>}
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
      className={`rhythm-panel ${collapsed ? 'is-collapsed' : ''} ${playing ? 'is-playing' : ''} is-${mode}`}
      style={{ '--rhythm-bar-ms': `${(60000 / Math.max(bpm, 1)) * 4}ms` } as CSSProperties}
    >
      <button
        type="button"
        className="rhythm-collapse-btn"
        onClick={() => setCollapsed(value => !value)}
        title={collapsed ? 'Expandir partitura rítmica' : 'Recolher partitura rítmica'}
      >
        {collapsed ? '^' : 'v'}
      </button>

      <div className="rhythm-panel-header">
        <div>
          <p className="rhythm-kicker">Partitura</p>
          {!collapsed && <h2>Bloco {Math.floor(startBarIndex / 4) + 1}</h2>}
        </div>
        {!collapsed && (
          <div className="rhythm-header-actions">
            <div className="rhythm-view-toggle" role="group" aria-label="Modo da partitura">
              <button
                type="button"
                className={mode === 'compact' ? 'active' : ''}
                onClick={() => setMode('compact')}
              >
                Mini
              </button>
              <button
                type="button"
                className={mode === 'detail' ? 'active' : ''}
                onClick={() => setMode('detail')}
              >
                Editar
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
    </aside>
  )
}
