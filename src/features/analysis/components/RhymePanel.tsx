// src/features/analysis/components/RhymePanel.tsx
import { useState } from 'react'
import { useAnalysisStore } from '../analysisStore'
import { CustomRhymeModal } from '../../rhyme/components/CustomRhymeModal'
import { EmptyState } from '../../../components/ui/EmptyState'

export function RhymePanel() {
  const { rhymeAnalysis } = useAnalysisStore()
  const [showDictModal, setShowDictModal] = useState(false)

  if (!rhymeAnalysis) {
    return (
      <>
        <EmptyState icon="🎵" text="Comece a escrever para ver as rimas" />
        <DictButton onClick={() => setShowDictModal(true)} />
        {showDictModal && <CustomRhymeModal onClose={() => setShowDictModal(false)} />}
      </>
    )
  }

  const { scheme, chains, rhymeDensity, matches, internalRhymes, multisyllabicMatches, suggestions } = rhymeAnalysis

  return (
    <div className="p-3 space-y-4">
      {/* Esquema e densidade */}
      <div className="flex gap-2">
        <div className="flex-1 bg-studio-elevated rounded p-2 text-center">
          <div className="text-2xl font-bold font-mono text-accent-glow">{scheme}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Esquema</div>
        </div>
        <div className="flex-1 bg-studio-elevated rounded p-2 text-center">
          <div className="text-2xl font-bold font-mono text-accent-secondary">
            {Math.round(rhymeDensity * 100)}%
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">Densidade</div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'Rimas finais',     value: matches.length,             color: 'text-accent-primary' },
          { label: 'Internas',         value: internalRhymes.length,      color: 'text-accent-secondary' },
          { label: 'Multissilábicas',  value: multisyllabicMatches.length, color: 'text-accent-gold' },
          { label: 'Cadeias',          value: chains.length,              color: 'text-accent-green' },
        ].map(stat => (
          <div key={stat.label} className="bg-studio-elevated rounded p-2">
            <div className={`text-base font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Cadeias de rima */}
      {chains.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Cadeias de Rima</h3>
          <div className="space-y-1">
            {chains.map(chain => (
              <div key={chain.id} className="flex items-center gap-2 bg-studio-elevated rounded px-2 py-1.5">
                <span className="rhyme-chain-dot" style={{ backgroundColor: chain.color }} />
                <span className="font-bold text-xs" style={{ color: chain.color }}>{chain.label}</span>
                <span className="text-text-secondary text-xs truncate">
                  {chain.words.slice(0, 4).join(' · ')}
                  {chain.words.length > 4 && ` +${chain.words.length - 4}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões de rima */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Sugestões</h3>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map(sug => (
              <div key={sug.forWord} className="bg-studio-elevated rounded p-2">
                <div className="text-xs font-medium text-accent-primary mb-1">→ "{sug.forWord}"</div>
                <div className="flex flex-wrap gap-1">
                  {sug.suggestions.map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 bg-studio-bg rounded text-text-secondary hover:text-text-primary cursor-default">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão dicionário */}
      <DictButton onClick={() => setShowDictModal(true)} />

      {showDictModal && <CustomRhymeModal onClose={() => setShowDictModal(false)} />}
    </div>
  )
}

function DictButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-center text-[11px] text-text-muted border border-studio-border rounded py-1.5 hover:border-accent-primary hover:text-accent-glow transition-colors"
    >
      📖 Dicionário personalizado
    </button>
  )
}
