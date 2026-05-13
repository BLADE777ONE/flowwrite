// src/features/analysis/components/RightAnalysisPanel.tsx
import { useAnalysisStore } from '../analysisStore'
import { useEditorStore } from '../../editor/editorStore'
import { RhymePanel } from './RhymePanel'
import { MetricsPanel } from './MetricsPanel'
import { InsightsPanel } from './InsightsPanel'
import { ClichePanel } from './ClichePanel'
import { ArtistDNAPanel } from './ArtistDNAPanel'
import { QualityPanel } from './QualityPanel'
import { BPMPanel } from '../../metrics/components/BPMPanel'

const TABS = [
  { id: 'rhyme',    label: 'Rimas',   icon: '🎵' },
  { id: 'metrics',  label: 'Métrica', icon: '📏' },
  { id: 'bpm',      label: 'BPM',     icon: '🥁' },
  { id: 'insights', label: 'Insight', icon: '💡' },
  { id: 'cliches',  label: 'Clichês', icon: '⚠️' },
  { id: 'dna',      label: 'DNA',     icon: '🧬' },
  { id: 'quality',  label: 'Score',   icon: '⭐' },
] as const

type Tab = typeof TABS[number]['id']

export function RightAnalysisPanel() {
  const { activeTab, setActiveTab, isAnalyzing, analysisProgress, pythonAvailable } = useAnalysisStore()
  const { bpm, setBpm } = useEditorStore()

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0d0d1a 0%, #09091a 100%)' }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="px-3 py-2.5 flex-shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          {/* Ícone de análise */}
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(8,145,178,0.3))', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <span className="text-[10px]">⚡</span>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'rgba(192,132,252,0.8)' }}
          >
            Análise
          </span>
          {pythonAvailable && (
            <div
              className="flex items-center gap-1 rounded px-1.5 py-0.5"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
              title="Python ativo — análise fonética PT-BR"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }}
              />
              <span className="text-[8px] font-mono font-bold" style={{ color: '#4ade80' }}>PY</span>
            </div>
          )}
        </div>

        {/* Status */}
        {isAnalyzing ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${analysisProgress}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #22d3ee)',
                }}
              />
            </div>
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: '#a855f7',
                    animation: `bounceDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <span className="text-[9px] text-text-muted opacity-40 font-mono">live</span>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-shrink-0 overflow-x-auto scrollbar-none"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className="panel-tab flex-shrink-0"
              style={isActive ? {
                color: '#eeeeff',
                borderBottomColor: '#7c3aed',
              } : {}}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              <span className="text-[8px]">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'rhyme'    && <RhymePanel />}
        {activeTab === 'metrics'  && <MetricsPanel />}
        {activeTab === 'bpm'      && <BPMPanel bpm={bpm} onBpmChange={setBpm} />}
        {activeTab === 'insights' && <InsightsPanel />}
        {activeTab === 'cliches'  && <ClichePanel />}
        {activeTab === 'dna'      && <ArtistDNAPanel />}
        {activeTab === 'quality'  && <QualityPanel />}
      </div>
    </div>
  )
}
