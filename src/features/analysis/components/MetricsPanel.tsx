// src/features/analysis/components/MetricsPanel.tsx
import { useAnalysisStore } from '../analysisStore'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PythonStressWord } from '../analysisStore'

const FLOW_LABELS: Record<string, { label: string; color: string }> = {
  slow: { label: 'Lento', color: 'text-blue-400' },
  medium: { label: 'Médio', color: 'text-green-400' },
  fast: { label: 'Rápido', color: 'text-yellow-400' },
  very_fast: { label: 'Double Time', color: 'text-red-400' },
}

export function MetricsPanel() {
  const { metricsAnalysis, pythonAnalysis, pythonAvailable } = useAnalysisStore()

  if (!metricsAnalysis) {
    return <EmptyState icon="📏" text="Escreva versos para análise métrica" />
  }

  const { lines, averageSyllables, regularityScore, flowSpeed, warnings, totalLines } = metricsAnalysis
  const flowInfo = FLOW_LABELS[flowSpeed] || FLOW_LABELS.medium
  const usingPython = pythonAvailable && pythonAnalysis !== null

  return (
    <div className="p-3 space-y-4">
      {/* Badge Python */}
      {usingPython && (
        <div
          className="flex items-center gap-1.5 rounded-lg px-2 py-1"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
          <span className="text-[9px] font-medium" style={{ color: '#4ade80' }}>
            Análise fonética PT-BR {pythonAnalysis.syllables.has_pyphen ? '· pyphen ativo' : '· modo fallback'}
          </span>
        </div>
      )}

      {/* Stats principais */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-studio-elevated rounded p-2 text-center">
          <div className="text-xl font-bold font-mono text-accent-primary">
            {Math.round(averageSyllables)}
          </div>
          <div className="text-[10px] text-text-muted">Síl/verso</div>
        </div>
        <div className="bg-studio-elevated rounded p-2 text-center">
          <div className="text-xl font-bold font-mono text-accent-gold">{regularityScore}</div>
          <div className="text-[10px] text-text-muted">Regular.</div>
        </div>
        <div className="bg-studio-elevated rounded p-2 text-center">
          <div className={`text-sm font-bold ${flowInfo.color}`}>{flowInfo.label}</div>
          <div className="text-[10px] text-text-muted mt-1">Flow</div>
        </div>
      </div>

      {/* Alertas */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex gap-2 text-xs text-accent-gold bg-accent-gold/10 rounded px-2 py-1.5">
              <span>⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Linhas individuais */}
      <div>
        <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
          Versos ({totalLines})
        </h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {lines.map((line, idx) => {
            const pyLine = pythonAnalysis?.syllables.lines[idx]
            const stressWords = pyLine?.stressWords ?? []
            return (
              <div
                key={line.lineIndex}
                className={`rounded px-2 py-1.5 ${
                  line.isTooLong ? 'bg-accent-red/10 border border-accent-red/20' :
                  line.isTooShort ? 'bg-accent-gold/10 border border-accent-gold/20' :
                  'bg-studio-elevated'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted truncate flex-1 mr-2">
                    {line.text.substring(0, 35)}{line.text.length > 35 ? '…' : ''}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono text-xs font-bold text-accent-primary">
                      {line.syllableCount}s
                    </span>
                    <SyllableBar count={line.syllableCount} />
                  </div>
                </div>
                {stressWords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stressWords.filter(w => w.stress === 'strong').map((w, i) => (
                      <span
                        key={i}
                        className="text-[9px] rounded px-1 py-0.5"
                        style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                )}
                {line.suggestions.length > 0 && !stressWords.length && (
                  <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{line.suggestions[0]}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SyllableBar({ count }: { count: number }) {
  const max = 20
  const pct = Math.min(100, (count / max) * 100)
  const color = count > 18 ? 'bg-accent-red' : count < 6 ? 'bg-accent-gold' : 'bg-accent-primary'
  return (
    <div className="w-12 h-1 bg-studio-bg rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
