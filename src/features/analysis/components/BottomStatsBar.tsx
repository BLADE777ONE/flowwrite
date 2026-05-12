// src/features/analysis/components/BottomStatsBar.tsx
import { useEditorStore } from '../../editor/editorStore'
import { useAnalysisStore } from '../analysisStore'

export function BottomStatsBar() {
  const { content, isDirty, isSaving, lastSavedAt } = useEditorStore()
  const { rhymeAnalysis, metricsAnalysis, qualityAnalysis, isAnalyzing } = useAnalysisStore()

  const words   = content.split(/\s+/).filter(Boolean).length
  const lines   = content.split('\n').filter(l => l.trim()).length
  const avgSyl  = metricsAnalysis ? Math.round(metricsAnalysis.averageSyllables) : '—'
  const rhymeD  = rhymeAnalysis   ? Math.round(rhymeAnalysis.rhymeDensity * 100) : '—'
  const overall = qualityAnalysis ? qualityAnalysis.overallScore : null
  const grade   = qualityAnalysis ? qualityAnalysis.grade : null

  const saveLabel = isSaving
    ? '↑ Salvando…'
    : isDirty
      ? '● Não salvo'
      : lastSavedAt
        ? `✓ ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : ''

  const saveColor = isSaving ? '#9898c0' : isDirty ? '#f59e0b' : '#10b981'

  return (
    <div
      className="h-6 flex-shrink-0 flex items-center gap-3 px-4 text-[10px] overflow-x-auto select-none"
      style={{
        background: '#05050e',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        color: '#555575',
      }}
    >
      <StatItem label="palavras" value={words} />
      <Sep />
      <StatItem label="linhas" value={lines} />
      <Sep />
      <StatItem label="síl/verso" value={avgSyl} />
      <Sep />
      <StatItem label="rimas" value={rhymeD !== '—' ? `${rhymeD}%` : '—'} />

      {overall !== null && (
        <>
          <Sep />
          <div className="flex items-center gap-1">
            <span style={{ color: '#555575' }}>score</span>
            <span
              className="font-bold font-mono"
              style={{
                color: overall >= 80 ? '#10b981' : overall >= 60 ? '#f59e0b' : '#eeeeff'
              }}
            >
              {overall}
            </span>
            {grade && (
              <span className="font-bold text-[9px]" style={{ color: '#a855f7' }}>{grade}</span>
            )}
          </div>
        </>
      )}

      {isAnalyzing && (
        <>
          <Sep />
          <span style={{ color: '#9d5cf0' }} className="animate-pulse">⚙ analisando</span>
        </>
      )}

      {/* Direita — status */}
      <div className="ml-auto flex items-center gap-1.5">
        {saveLabel && (
          <span className="font-mono text-[9px]" style={{ color: saveColor }}>{saveLabel}</span>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: '#555575' }}>{label}</span>
      <span className="font-mono font-medium" style={{ color: '#9898c0' }}>{value}</span>
    </div>
  )
}

function Sep() {
  return <span style={{ color: 'rgba(255,255,255,0.06)' }}>│</span>
}
