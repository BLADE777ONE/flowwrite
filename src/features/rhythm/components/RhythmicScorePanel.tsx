import { useMemo, useState } from 'react'
import { mapLineToRhythm, type RhythmLineMap, type RhythmSyllable } from '../rhythmMapping'

interface RhythmicScorePanelProps {
  lines: string[]
  bpm: number
  startBarIndex?: number
}

type SlotOverrides = Record<string, number>

const SLOT_MARKERS = ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a']

function getOverrideKey(lineIndex: number, syllableId: string): string {
  return `${lineIndex}:${syllableId}`
}

function getSlotFromPointer(clientX: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left))
  return Math.max(0, Math.min(15, Math.round((relativeX / rect.width) * 15)))
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

function BeatHeader() {
  return (
    <div className="rhythm-beat-header">
      <div className="rhythm-header-spacer">BAR</div>
      <div className="rhythm-header-grid">
        {SLOT_MARKERS.map((marker, index) => (
          <span key={`${marker}-${index}`} className={index % 4 === 0 ? 'strong' : ''}>
            {marker}
          </span>
        ))}
      </div>
    </div>
  )
}

function GridSlots() {
  return (
    <div className="rhythm-grid-slots" aria-hidden="true">
      {Array.from({ length: 16 }).map((_, slot) => (
        <span
          key={slot}
          className={slot % 4 === 0 ? 'rhythm-grid-slot strong' : 'rhythm-grid-slot'}
        />
      ))}
    </div>
  )
}

function SyllableNote({
  lineIndex,
  note,
  collapsed,
  onMove,
}: {
  lineIndex: number
  note: RhythmSyllable
  collapsed: boolean
  onMove: (lineIndex: number, note: RhythmSyllable, slot: number) => void
}) {
  if (collapsed) return null

  return (
    <button
      type="button"
      className={`rhythm-note ${note.startsBeat ? 'strong' : ''}`}
      style={{
        left: `calc(${(note.slot / 16) * 100}% + 2px)`,
        width: `calc(${(note.durationSlots / 16) * 100}% - 4px)`,
      }}
      title={`${note.word} - slot ${note.slot + 1} (${note.timeMs}ms)`}
      onPointerDown={(event) => {
        const track = event.currentTarget.parentElement
        if (!track) return

        event.currentTarget.setPointerCapture(event.pointerId)
        onMove(lineIndex, note, getSlotFromPointer(event.clientX, track))

        const handleMove = (moveEvent: PointerEvent) => {
          onMove(lineIndex, note, getSlotFromPointer(moveEvent.clientX, track))
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
  collapsed,
  onMove,
}: {
  displayIndex: number
  sourceIndex: number
  map: RhythmLineMap
  collapsed: boolean
  onMove: (lineIndex: number, note: RhythmSyllable, slot: number) => void
}) {
  const filledSlots = new Set(map.syllables.map(note => note.slot))

  return (
    <div className="rhythm-line">
      <div className="rhythm-line-meta">
        <small>BAR</small>
        <span>{String(displayIndex + 1).padStart(2, '0')}</span>
        {!collapsed && <small>{Math.round(map.barDurationMs)}ms</small>}
      </div>

      {!collapsed && (
        <div className="rhythm-track">
          <GridSlots />
          <div className="rhythm-breath-row" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, slot) => (
              <span key={slot} className={!filledSlots.has(slot) ? 'breath' : ''} />
            ))}
          </div>
          {map.syllables.map(note => (
            <SyllableNote
              key={note.id}
              lineIndex={sourceIndex}
              note={note}
              collapsed={collapsed}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RhythmicScorePanel({ lines, bpm, startBarIndex = 0 }: RhythmicScorePanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [overrides, setOverrides] = useState<SlotOverrides>({})

  const rhythmLines = useMemo(() => {
    return lines
      .map((line, lineIndex) => ({
        sourceIndex: startBarIndex + lineIndex,
        map: mapLineToRhythm(line, bpm, undefined, buildLineOverrides(overrides, startBarIndex + lineIndex)),
      }))
      .filter(line => line.map.lineText.trim().length > 0)
  }, [lines, bpm, overrides, startBarIndex])

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
    <aside className={`rhythm-panel ${collapsed ? 'is-collapsed' : ''}`}>
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
          {!collapsed && <h2>Flow Grid</h2>}
        </div>
        {!collapsed && (
          <div className="rhythm-bpm-pill">
            <span>{bpm}</span>
            <small>BPM</small>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="rhythm-panel-stats">
          <span>{rhythmLines.length} barras</span>
          <span>{averageSyllables || '--'} sil/bar</span>
          <span>4/4</span>
        </div>
      )}

      {!collapsed && <BeatHeader />}

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
