// src/features/analysis/components/QualityPanel.tsx
import { useAnalysisStore } from '../analysisStore'
import { QualityAnalysis } from '../../../shared/types/Metrics'
import { EmptyState } from '../../../components/ui/EmptyState'

const GRADE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  S: { color: 'text-yellow-300', bg: 'bg-yellow-500/20', label: 'Excepcional' },
  A: { color: 'text-green-400',  bg: 'bg-green-500/20',  label: 'Excelente'   },
  B: { color: 'text-blue-400',   bg: 'bg-blue-500/20',   label: 'Bom'         },
  C: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Regular'     },
  D: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Fraco'       },
  F: { color: 'text-red-400',    bg: 'bg-red-500/20',    label: 'Rascunho'    },
}

const SCORE_BARS = [
  { key: 'rhymeScore',       label: 'Rimas',        icon: '🎵', color: 'bg-accent-primary' },
  { key: 'metricsScore',     label: 'Métrica',      icon: '📏', color: 'bg-accent-secondary' },
  { key: 'originalityScore', label: 'Originalidade',icon: '✨', color: 'bg-accent-green' },
  { key: 'vocabularyScore',  label: 'Vocabulário',  icon: '📖', color: 'bg-accent-gold' },
  { key: 'flowScore',        label: 'Flow',         icon: '🌊', color: 'bg-purple-500' },
] as const

export function QualityPanel() {
  const { qualityAnalysis } = useAnalysisStore()

  if (!qualityAnalysis) return <EmptyState icon="⭐" text="Escreva para gerar o score" />

  const grade = GRADE_CONFIG[qualityAnalysis.grade]

  return (
    <div className="p-3 space-y-4">
      {/* Overall Score + Grade */}
      <div className="flex gap-3 items-center">
        <div className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center ${grade.bg} border border-white/10`}>
          <span className={`text-4xl font-black ${grade.color}`}>{qualityAnalysis.grade}</span>
        </div>
        <div className="flex-1">
          <div className="text-3xl font-bold font-mono text-text-primary">{qualityAnalysis.overallScore}</div>
          <div className="text-xs text-text-muted">{grade.label}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Score Geral</div>
        </div>
      </div>

      {/* Barras de score */}
      <div className="space-y-2">
        {SCORE_BARS.map(({ key, label, icon, color }) => {
          const value = qualityAnalysis[key as keyof QualityAnalysis] as number
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <span>{icon}</span>{label}
                </span>
                <span className="text-xs font-mono font-bold text-text-primary">{value}</span>
              </div>
              <div className="w-full h-1.5 bg-studio-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}

        {/* Penalidade clichê */}
        {qualityAnalysis.clichePenalty > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-accent-red flex items-center gap-1">⚠️ Penalidade Clichê</span>
              <span className="text-xs font-mono font-bold text-accent-red">-{qualityAnalysis.clichePenalty}</span>
            </div>
            <div className="w-full h-1.5 bg-studio-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-red transition-all duration-500"
                style={{ width: `${qualityAnalysis.clichePenalty}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recomendações */}
      {qualityAnalysis.recommendations.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Recomendações</h3>
          <div className="space-y-1.5">
            {qualityAnalysis.recommendations.map((rec, i) => (
              <div
                key={i}
                className="text-xs text-text-secondary bg-studio-elevated rounded px-2.5 py-2 border-l-2 border-accent-primary/50 leading-relaxed"
              >
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
