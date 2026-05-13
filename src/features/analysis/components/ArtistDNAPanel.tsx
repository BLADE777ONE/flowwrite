// src/features/analysis/components/ArtistDNAPanel.tsx
import { useAnalysisStore } from '../analysisStore'

export function ArtistDNAPanel() {
  const { artistDNA } = useAnalysisStore()

  if (!artistDNA || artistDNA.totalWords === 0) {
    return (
      <div className="p-4 text-center space-y-2">
        <div className="text-4xl">🧬</div>
        <p className="text-sm text-text-muted">Salve letras para gerar seu DNA estilístico</p>
        <p className="text-[10px] text-text-muted opacity-60">
          O perfil é atualizado automaticamente a cada 5 autosaves
        </p>
      </div>
    )
  }

  const entropyPercent = Math.round(artistDNA.vocabularyEntropy * 100)
  const updatedStr = artistDNA.updatedAt
    ? new Date(artistDNA.updatedAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    : null

  return (
    <div className="p-3 space-y-4">
      {/* Header com data de atualização */}
      {updatedStr && (
        <div className="text-[9px] text-text-muted text-right">
          Atualizado em {updatedStr}
        </div>
      )}

      {/* Stats principais */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-studio-elevated rounded p-2">
          <div className="text-base font-bold text-accent-primary font-mono">{artistDNA.totalWords}</div>
          <div className="text-[10px] text-text-muted">Total de palavras</div>
        </div>
        <div className="bg-studio-elevated rounded p-2">
          <div className="text-base font-bold text-accent-secondary font-mono">
            {artistDNA.uniqueWords > 0 ? artistDNA.uniqueWords : '—'}
          </div>
          <div className="text-[10px] text-text-muted">Palavras únicas</div>
        </div>
        <div className="bg-studio-elevated rounded p-2">
          <div className="text-base font-bold text-accent-gold font-mono">{artistDNA.totalSongs}</div>
          <div className="text-[10px] text-text-muted">Letras</div>
        </div>
        <div className="bg-studio-elevated rounded p-2">
          <div className="text-base font-bold text-accent-green font-mono">
            {Math.round(artistDNA.averageSyllablesPerLine)}s
          </div>
          <div className="text-[10px] text-text-muted">Síl/verso médio</div>
        </div>
      </div>

      {/* Entropia */}
      <div className="bg-studio-elevated rounded p-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-text-secondary">Entropia de Vocabulário</span>
          <span className={`text-xs font-bold font-mono ${
            entropyPercent > 70 ? 'text-accent-green' :
            entropyPercent > 40 ? 'text-accent-gold' : 'text-accent-red'
          }`}>{entropyPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-studio-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              entropyPercent > 70 ? 'bg-accent-green' :
              entropyPercent > 40 ? 'bg-accent-gold' : 'bg-accent-red'
            }`}
            style={{ width: `${entropyPercent}%` }}
          />
        </div>
        <div className="mt-1 text-[9px] text-text-muted">
          {entropyPercent > 70 ? 'Vocabulário rico e diverso' :
           entropyPercent > 40 ? 'Vocabulário moderado' :
           'Vocabulário repetitivo — diversifique'}
        </div>
      </div>

      {/* Vibe dominante */}
      {artistDNA.dominantVibe && (
        <div className="bg-accent-primary/10 border border-accent-primary/20 rounded p-2 text-center">
          <div className="text-xs text-text-muted mb-0.5">Vibe Dominante</div>
          <div className="text-sm font-bold text-accent-glow capitalize">{artistDNA.dominantVibe}</div>
        </div>
      )}

      {/* Temas recorrentes */}
      {artistDNA.recurringThemes.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Temas Recorrentes</h3>
          <div className="space-y-1">
            {artistDNA.recurringThemes.slice(0, 4).map((theme, i) => (
              <div key={i} className="flex items-center gap-2 bg-studio-elevated rounded px-2 py-1.5">
                <div
                  className="h-1.5 rounded-full flex-shrink-0"
                  style={{
                    width: `${Math.round(theme.weight * 100)}%`,
                    maxWidth: '60px',
                    backgroundColor: `hsl(${i * 60}, 70%, 60%)`
                  }}
                />
                <span className="text-[10px] text-text-secondary capitalize truncate">{theme.theme}</span>
                <span className="text-[9px] text-text-muted ml-auto">{Math.round(theme.weight * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Palavras frequentes */}
      {artistDNA.frequentWords.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Palavras mais usadas</h3>
          <div className="flex flex-wrap gap-1">
            {artistDNA.frequentWords.slice(0, 14).map(w => (
              <span
                key={w.word}
                className="text-[10px] px-1.5 py-0.5 bg-studio-bg rounded text-text-secondary"
                title={`${w.count}x`}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de repetição */}
      {artistDNA.repetitionAlerts.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Alertas</h3>
          <div className="space-y-1">
            {artistDNA.repetitionAlerts.map((alert, i) => (
              <div key={i} className="text-[10px] text-accent-gold bg-accent-gold/10 rounded px-2 py-1">
                {alert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões de evolução */}
      {artistDNA.evolutionSuggestions.length > 0 && (
        <div>
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Sugestões de Evolução</h3>
          <div className="space-y-1">
            {artistDNA.evolutionSuggestions.map((sug, i) => (
              <div key={i} className="text-[10px] text-text-secondary bg-studio-elevated rounded px-2 py-1.5 leading-relaxed">
                💡 {sug}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
