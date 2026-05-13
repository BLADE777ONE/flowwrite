// src/features/metrics/components/BPMPanel.tsx
// Grid visual de BPM: mostra como cada linha se encaixa no beat

import { useCallback, useState, useEffect } from 'react'
import { useAnalysisStore } from '../../analysis/analysisStore'
import { useEditorStore } from '../../editor/editorStore'

const BEATS_PER_BAR = 4
const BARS_PER_VERSE_LINE = 2        // tipicamente 2 compassos por linha
const DEFAULT_SYLLABLES_PER_BEAT = 2 // flow médio: 2 sílabas por beat

function getBeatFill(syllables: number, bpm: number): {
  bars: number; fill: number; density: 'slow' | 'ok' | 'fast' | 'double'; msPerSyl: number; pressure: 'ok' | 'high' | 'extreme'
} {
  const beatsPerLine = BEATS_PER_BAR * BARS_PER_VERSE_LINE
  const syllablesPerBeat = syllables / beatsPerLine

  let density: 'slow' | 'ok' | 'fast' | 'double'
  if      (syllablesPerBeat < 1)   density = 'slow'
  else if (syllablesPerBeat < 2.5) density = 'ok'
  else if (syllablesPerBeat < 4)   density = 'fast'
  else                             density = 'double'

  const fill = Math.min(1, syllablesPerBeat / 4)

  // ms disponíveis por sílaba: indica dificuldade de entrega ao BPM atual
  const msPerSyl = syllables > 0 ? Math.round(480000 / (bpm * syllables)) : 999
  const pressure: 'ok' | 'high' | 'extreme' =
    msPerSyl < 180 ? 'extreme' : msPerSyl < 240 ? 'high' : 'ok'

  return { bars: BARS_PER_VERSE_LINE, fill, density, msPerSyl, pressure }
}

const DENSITY_COLORS = {
  slow:   { bar: 'bg-blue-500',  text: 'text-blue-400',  label: 'Lento' },
  ok:     { bar: 'bg-accent-green', text: 'text-accent-green', label: 'OK' },
  fast:   { bar: 'bg-accent-gold',  text: 'text-accent-gold',  label: 'Rápido' },
  double: { bar: 'bg-accent-red',   text: 'text-accent-red',   label: '2x' },
}

interface Props {
  bpm: number
  onBpmChange: (bpm: number) => void
}

export function BPMPanel({ bpm, onBpmChange }: Props) {
  const { metricsAnalysis } = useAnalysisStore()

  // Estado local para o input numérico — permite digitar livremente sem travar
  const [inputVal, setInputVal] = useState(String(bpm))
  useEffect(() => { setInputVal(String(bpm)) }, [bpm])

  // Range slider: sempre produz valores válidos, atualiza direto
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) onBpmChange(val)
  }, [onBpmChange])

  // Number input: digita livremente, valida só no blur ou Enter
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value)
  }
  const commitNumber = () => {
    const val = parseInt(inputVal, 10)
    if (!isNaN(val) && val >= 40 && val <= 240) onBpmChange(val)
    else setInputVal(String(bpm))
  }

  // Tempo por bar em ms
  const msPerBeat = 60000 / bpm
  const msPerBar  = msPerBeat * BEATS_PER_BAR
  const msPerLine = msPerBar * BARS_PER_VERSE_LINE

  // Referência de sílabas para este BPM
  const comfortMax = Math.max(16, Math.round(1800 / bpm))
  const targetSyl  = BEATS_PER_BAR * BARS_PER_VERSE_LINE * 2  // 2 síl/beat = padrão

  return (
    <div className="p-3 space-y-4">
      {/* BPM Input */}
      <div className="flex items-center gap-3 bg-studio-elevated rounded p-3">
        <div className="flex-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">BPM</div>
          <input
            type="range"
            min={40}
            max={240}
            value={bpm}
            onChange={handleSlider}
            className="w-full accent-accent-primary h-1.5 rounded"
          />
        </div>
        <div className="flex flex-col items-center w-14">
          <input
            type="text"
            inputMode="numeric"
            value={inputVal}
            onChange={handleNumberChange}
            onBlur={commitNumber}
            onKeyDown={e => { if (e.key === 'Enter') commitNumber() }}
            onFocus={e => e.target.select()}
            className="w-full bg-studio-bg border border-studio-border rounded px-1 py-0.5 text-center text-lg font-bold font-mono text-accent-glow outline-none focus:border-accent-primary"
          />
          <span className="text-[9px] text-text-muted mt-0.5">BPM</span>
        </div>
      </div>

      {/* Info de tempo */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-studio-elevated rounded p-2 text-center">
          <div className="text-sm font-bold font-mono text-accent-secondary">
            {(msPerBeat / 1000).toFixed(2)}s
          </div>
          <div className="text-[10px] text-text-muted">por beat</div>
        </div>
        <div className="bg-studio-elevated rounded p-2 text-center">
          <div className="text-sm font-bold font-mono text-accent-gold">
            {(msPerLine / 1000).toFixed(1)}s
          </div>
          <div className="text-[10px] text-text-muted">por 2 compassos</div>
        </div>
        <div className="bg-studio-elevated rounded p-2 text-center">
          <div className="text-sm font-bold font-mono text-accent-green">
            {targetSyl}
          </div>
          <div className="text-[10px] text-text-muted">síl. alvo</div>
        </div>
      </div>

      {/* Referência de conforto */}
      <div className="bg-studio-elevated rounded p-2 flex items-center justify-between text-[10px]">
        <span className="text-text-muted">Confortável até</span>
        <span className="font-bold font-mono text-accent-primary">{comfortMax} síl/verso</span>
        <span className="text-text-muted">a {bpm} BPM</span>
      </div>

      {/* Beat grid por linha */}
      {metricsAnalysis && metricsAnalysis.lines.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
            Encaixe no Beat
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {metricsAnalysis.lines.map((line, idx) => {
              const { fill, density, msPerSyl, pressure } = getBeatFill(line.syllableCount, bpm)
              const colors = DENSITY_COLORS[density]
              const pressureColor =
                pressure === 'extreme' ? 'text-accent-red' :
                pressure === 'high'    ? 'text-accent-gold' : 'text-text-muted'

              return (
                <div key={idx} className="bg-studio-elevated rounded px-2 py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-muted truncate flex-1 mr-2">
                      {line.text.substring(0, 28)}{line.text.length > 28 ? '…' : ''}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[9px] font-mono ${pressureColor}`}>{msPerSyl}ms/síl</span>
                      <span className={`text-[9px] font-bold ${colors.text}`}>{colors.label}</span>
                      <span className="text-[9px] font-mono text-text-muted">{line.syllableCount}s</span>
                    </div>
                  </div>

                  {/* Grid de beats */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: BEATS_PER_BAR * BARS_PER_VERSE_LINE }).map((_, beatIdx) => {
                      const beatFilled = fill * BEATS_PER_BAR * BARS_PER_VERSE_LINE > beatIdx
                      return (
                        <div
                          key={beatIdx}
                          className={`h-1.5 flex-1 rounded-sm transition-colors ${
                            beatFilled ? colors.bar : 'bg-studio-bg'
                          } ${beatIdx === BEATS_PER_BAR - 1 || beatIdx === BEATS_PER_BAR * 2 - 1
                            ? 'mr-1' : ''}`}
                        />
                      )
                    })}
                  </div>
                  {/* Marcadores de compasso */}
                  <div className="flex text-[7px] text-text-muted mt-0.5 opacity-50">
                    {Array.from({ length: BEATS_PER_BAR * BARS_PER_VERSE_LINE }).map((_, i) => (
                      <span key={i} className={`flex-1 ${i === BEATS_PER_BAR - 1 ? 'mr-1' : ''}`}>
                        {(i % BEATS_PER_BAR) + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="grid grid-cols-2 gap-1 text-[9px]">
        {Object.entries(DENSITY_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-sm ${val.bar}`} />
            <span className="text-text-muted">{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
