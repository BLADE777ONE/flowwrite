// src/features/editor/components/GhostNotesView.tsx
// Vista alternativa do editor que mostra marcadores de tônica acima das palavras
// Ativada/desativada pelo botão "Ghost Notes" no header do editor

import { useMemo } from 'react'
import { MetricsAnalysis, StressWord } from '../../../shared/types/Metrics'

interface Props {
  content: string
  metricsAnalysis: MetricsAnalysis | null
}

const STRESS_MARKS: Record<string, { char: string; color: string; size: string }> = {
  strong: { char: '●', color: '#f59e0b', size: 'text-[8px]' },
  medium: { char: '◉', color: '#06b6d4', size: 'text-[7px]' },
  weak:   { char: '○', color: '#606080', size: 'text-[6px]' },
}

interface WordToken {
  word: string
  stress: 'strong' | 'medium' | 'weak' | null
  isSpace: boolean
}

function tokenizeLine(lineText: string, stressWords: StressWord[]): WordToken[] {
  const tokens: WordToken[] = []
  const wordRegex = /(\S+|\s+)/g
  let match: RegExpExecArray | null
  let wordIdx = 0

  while ((match = wordRegex.exec(lineText)) !== null) {
    const token = match[0]
    if (/^\s+$/.test(token)) {
      tokens.push({ word: token, stress: null, isSpace: true })
    } else {
      const stressInfo = stressWords.find(sw => sw.position === wordIdx)
      tokens.push({
        word: token,
        stress: stressInfo?.stress ?? 'weak',
        isSpace: false,
      })
      wordIdx++
    }
  }

  return tokens
}

export function GhostNotesView({ content, metricsAnalysis }: Props) {
  const lines = useMemo(() => content.split('\n'), [content])

  if (!metricsAnalysis) {
    return (
      <div className="ghost-notes-view p-6 font-mono text-base leading-relaxed text-text-muted">
        <p>Analisando métricas…</p>
      </div>
    )
  }

  return (
    <div className="ghost-notes-view p-6 overflow-y-auto h-full">
      <div className="ghost-notes-header mb-4 flex items-center gap-2">
        <span className="text-[10px] text-accent-gold font-bold uppercase tracking-widest">Ghost Notes</span>
        <div className="flex items-center gap-3 text-[9px] text-text-muted">
          <span><span className="text-accent-gold">●</span> tônica forte</span>
          <span><span className="text-accent-secondary">◉</span> tônica média</span>
          <span><span className="text-text-muted">○</span> átona</span>
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((lineText, lineIdx) => {
          const lineMetrics = metricsAnalysis.lines[lineIdx]
          const stressWords = lineMetrics?.estimatedStressWords ?? []
          const tokens = tokenizeLine(lineText, stressWords)
          const syllCount = lineMetrics?.syllableCount ?? 0

          return (
            <div key={lineIdx} className="ghost-notes-line group">
              {/* Número da linha + contagem de sílabas */}
              <div className="flex items-baseline gap-3 mb-0.5">
                <span className="text-[9px] text-text-muted w-5 text-right flex-shrink-0 font-mono select-none">
                  {lineIdx + 1}
                </span>
                {syllCount > 0 && (
                  <span className="text-[9px] text-accent-primary font-mono">{syllCount}s</span>
                )}
              </div>

              {/* Linha com marcadores de tônica */}
              <div className="flex items-end flex-wrap gap-x-0 ml-8 font-mono text-base leading-none">
                {tokens.map((token, tIdx) => {
                  if (token.isSpace) {
                    return <span key={tIdx} className="w-2 inline-block" />
                  }

                  const mark = token.stress ? STRESS_MARKS[token.stress] : null

                  return (
                    <span key={tIdx} className="inline-flex flex-col items-center mr-1">
                      {/* Marcador de tônica acima da palavra */}
                      <span
                        className={`${mark?.size ?? 'text-[6px]'} leading-none mb-0.5 select-none`}
                        style={{ color: mark?.color ?? 'transparent' }}
                        aria-hidden="true"
                      >
                        {mark?.char ?? '○'}
                      </span>
                      {/* Texto da palavra */}
                      <span
                        className={`leading-snug ${
                          token.stress === 'strong'
                            ? 'text-text-primary'
                            : token.stress === 'medium'
                            ? 'text-text-secondary'
                            : 'text-text-muted'
                        }`}
                      >
                        {token.word}
                      </span>
                    </span>
                  )
                })}
              </div>

              {/* Pontos de respiração */}
              {lineMetrics?.breathPoints && lineMetrics.breathPoints.length > 0 && (
                <div className="ml-8 mt-0.5 flex gap-1">
                  {lineMetrics.breathPoints.map((bp, bIdx) => (
                    <span
                      key={bIdx}
                      className="text-[8px] text-accent-secondary opacity-60"
                      title={`Ponto de respiração após palavra ${bp}`}
                    >
                      ↕
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
