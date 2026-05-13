// src/features/analysis/components/ClichePanel.tsx
import { useAnalysisStore } from '../analysisStore'
import { EmptyState } from '../../../components/ui/EmptyState'

const SEVERITY_CONFIG = {
  high: { label: 'Alto', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  medium: { label: 'Médio', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  low: { label: 'Baixo', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
}

export function ClichePanel() {
  const { clicheAnalysis } = useAnalysisStore()

  if (!clicheAnalysis) return <EmptyState icon="⚠️" text="Escreva para detectar clichês" />

  const { matches, totalCliches, score } = clicheAnalysis

  return (
    <div className="p-3 space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 bg-studio-elevated rounded p-2 text-center">
          <div className={`text-2xl font-bold font-mono ${score > 70 ? 'text-accent-green' : score > 40 ? 'text-accent-gold' : 'text-accent-red'}`}>
            {score}
          </div>
          <div className="text-[10px] text-text-muted">Score Orig.</div>
        </div>
        <div className="flex-1 bg-studio-elevated rounded p-2 text-center">
          <div className={`text-2xl font-bold font-mono ${totalCliches === 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {totalCliches}
          </div>
          <div className="text-[10px] text-text-muted">Clichês</div>
        </div>
      </div>

      {totalCliches === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm text-accent-green">Sem clichês detectados!</p>
          <p className="text-xs text-text-muted mt-1">Letra original.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider">Ocorrências</h3>
          {matches.map((match, i) => {
            const cfg = SEVERITY_CONFIG[match.severity]
            return (
              <div key={i} className={`rounded border px-3 py-2 ${cfg.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-primary">
                    "{match.phrase}"
                  </span>
                  <span className={`text-[10px] ${cfg.color} font-bold`}>{cfg.label}</span>
                </div>
                <p className="text-[10px] text-text-muted mb-1.5">{match.suggestion}</p>
                {match.alternatives.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">Alternativas:</p>
                    <div className="space-y-0.5">
                      {match.alternatives.slice(0, 2).map((alt, j) => (
                        <div key={j} className="text-[10px] text-accent-secondary italic pl-2 border-l border-accent-secondary/30">
                          "{alt}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
