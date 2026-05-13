// src/features/analysis/components/InsightsPanel.tsx
import { useState } from 'react'
import { useAnalysisStore } from '../analysisStore'
import { generateGhostwriterSuggestion } from '../../insights/GhostwriterService'
import { EmptyState } from '../../../components/ui/EmptyState'
import { RhymeAnalysis } from '../../../shared/types/Rhyme'
import { MetricsAnalysis } from '../../../shared/types/Metrics'

type SubTab = 'insights' | 'ghostwriter'

export function InsightsPanel() {
  const { insights, rhymeAnalysis, metricsAnalysis, lastAnalyzedText } = useAnalysisStore()
  const [subTab, setSubTab] = useState<SubTab>('insights')

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-studio-border flex-shrink-0">
        <button
          onClick={() => setSubTab('insights')}
          className={`flex-1 text-[10px] py-1.5 font-medium transition-colors ${
            subTab === 'insights'
              ? 'text-accent-glow border-b border-accent-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          💡 Insights
        </button>
        <button
          onClick={() => setSubTab('ghostwriter')}
          className={`flex-1 text-[10px] py-1.5 font-medium transition-colors ${
            subTab === 'ghostwriter'
              ? 'text-accent-glow border-b border-accent-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          👻 Ghostwriter
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === 'insights' ? (
          <InsightsContent />
        ) : (
          <GhostwriterContent
            text={lastAnalyzedText}
            rhymeAnalysis={rhymeAnalysis}
            metricsAnalysis={metricsAnalysis}
          />
        )}
      </div>
    </div>
  )
}

function InsightsContent() {
  const { insights } = useAnalysisStore()
  if (!insights) return <EmptyState icon="💡" text="Escreva para gerar insights" />

  return (
    <div className="p-3 space-y-4">
      <Section title="Ad-libs" emoji="🎤">
        <div className="flex flex-wrap gap-1">
          {insights.adlibs.map(a => (
            <span key={a} className="px-2 py-0.5 bg-accent-primary/20 text-accent-glow rounded text-xs font-mono">
              {a}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Onomatopeias" emoji="💥">
        <div className="flex flex-wrap gap-1">
          {insights.onomatopeias.map(o => (
            <span key={o} className="px-2 py-0.5 bg-accent-gold/20 text-accent-gold rounded text-xs font-mono">
              {o}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Wordplay" emoji="🎲">
        <div className="space-y-1">
          {insights.wordplayIdeas.map((idea, i) => (
            <div key={i} className="text-xs text-text-secondary bg-studio-elevated rounded px-2 py-1.5 leading-relaxed">
              {idea}
            </div>
          ))}
        </div>
      </Section>

      {insights.semanticFields.length > 0 && (
        <Section title="Campos Semânticos" emoji="🌐">
          <div className="space-y-1">
            {insights.semanticFields.map((field, i) => (
              <div key={i} className="text-xs text-text-muted">{field}</div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Variações de Vibe" emoji="🎚️">
        <div className="space-y-1">
          {insights.vibeVariations.map((v, i) => (
            <div key={i} className="text-xs text-text-secondary italic">{v}</div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function GhostwriterContent({
  text,
  rhymeAnalysis,
  metricsAnalysis,
}: {
  text: string
  rhymeAnalysis: RhymeAnalysis | null
  metricsAnalysis: MetricsAnalysis | null
}) {
  if (!rhymeAnalysis || !metricsAnalysis || !text.trim()) {
    return <EmptyState icon="👻" text="Escreva ao menos 2 versos para ativar o Ghostwriter" />
  }

  const suggestion = generateGhostwriterSuggestion(text, rhymeAnalysis, metricsAnalysis)
  if (!suggestion) return <EmptyState icon="👻" text="Escreva mais versos para sugestões" />

  const FLOW_LABELS: Record<string, string> = {
    slow: 'Lento', medium: 'Médio', fast: 'Rápido', very_fast: 'Double Time'
  }

  return (
    <div className="p-3 space-y-4">
      {/* Meta do próximo verso */}
      <div className="bg-accent-primary/10 border border-accent-primary/20 rounded p-3 space-y-2">
        <div className="text-[10px] text-accent-glow uppercase tracking-wider font-bold">
          👻 Próximo Verso
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="bg-studio-elevated rounded px-2 py-1 text-center">
            <div className="text-sm font-bold font-mono text-accent-primary">{suggestion.targetSyllables}</div>
            <div className="text-[9px] text-text-muted">sílabas</div>
          </div>
          <div className="bg-studio-elevated rounded px-2 py-1 text-center">
            <div className="text-xs font-bold text-accent-secondary">{FLOW_LABELS[suggestion.flowSpeed]}</div>
            <div className="text-[9px] text-text-muted">flow</div>
          </div>
          {suggestion.nextRhymeClass && (
            <div className="bg-studio-elevated rounded px-2 py-1 text-center">
              <div className="text-sm font-bold font-mono text-accent-gold">{suggestion.nextRhymeClass}</div>
              <div className="text-[9px] text-text-muted">cadeia</div>
            </div>
          )}
        </div>
      </div>

      {/* Opções de rima */}
      {suggestion.rhymeOptions.length > 0 && (
        <Section title="Termine com" emoji="🎯">
          <div className="flex flex-wrap gap-1">
            {suggestion.rhymeOptions.map((r, i) => (
              <span
                key={r}
                className={`px-2 py-0.5 rounded text-xs font-mono cursor-default ${
                  i === 0
                    ? 'bg-accent-primary text-white'
                    : 'bg-studio-elevated text-text-secondary hover:text-text-primary'
                }`}
                title={i === 0 ? 'Rima mais indicada' : 'Alternativa'}
              >
                {r}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Templates de início de verso */}
      <Section title="Inícios Sugeridos" emoji="✍️">
        <div className="space-y-1.5">
          {suggestion.templateStarters.map((s, i) => (
            <div
              key={i}
              className="text-xs text-text-secondary bg-studio-elevated rounded px-2 py-2 leading-relaxed font-mono border-l-2 border-accent-primary/30"
            >
              {s}
            </div>
          ))}
        </div>
      </Section>

      {/* Dicas de estilo */}
      <Section title="Dicas de Flow" emoji="💡">
        <div className="space-y-1">
          {suggestion.styleHints.map((h, i) => (
            <div key={i} className="text-[11px] text-text-muted bg-studio-elevated rounded px-2 py-1.5 leading-relaxed">
              {h}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
        <span>{emoji}</span> {title}
      </h3>
      {children}
    </div>
  )
}
