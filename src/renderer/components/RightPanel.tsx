import type { ReactNode } from 'react'
import { analyzeRhymes, findRhymesTyped, type RhymeSuggestion } from '../../features/rhyme/RhymeService'
import { analyzeMetrics } from '../../features/metrics/MetricsService'
import type { FlowSpeed, LineMetrics } from '../../shared/types/Metrics'
import type { DictionaryResult } from '../../features/dictionary/DictionaryService'
import type { ActiveToolTab } from '../types'
import type { RhymeSchemeBlock } from '../../shared/types/Rhyme'

interface RightPanelProps {
  activeTab: ActiveToolTab
  selectedWord: string
  lines: string[]
  dictResult: DictionaryResult | null
  dictLoading: boolean
  onTabChange: (tab: ActiveToolTab) => void
  onInsertWord: (word: string) => void
}

const typeLabel: Record<string, string> = {
  exact: 'exata',
  approximate: 'aprox.',
  assonance: 'asso.',
  rich: 'rica',
  poor: 'pobre',
  multisyllabic: 'multi',
  internal: 'int.',
}

const typeBadge: Record<string, string> = {
  exact: 'bg-green-900/60 text-green-300 border-green-700',
  approximate: 'bg-blue-900/60 text-blue-300 border-blue-700',
  assonance: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  rich: 'bg-purple-900/60 text-purple-300 border-purple-700',
  poor: 'bg-gray-800 text-gray-500 border-gray-700',
  multisyllabic: 'bg-cyan-900/60 text-cyan-300 border-cyan-700',
  internal: 'bg-orange-900/60 text-orange-300 border-orange-700',
}

function TabButton({ tab, activeTab, onTabChange, children }: {
  tab: ActiveToolTab
  activeTab: ActiveToolTab
  onTabChange: (tab: ActiveToolTab) => void
  children: ReactNode
}) {
  return (
    <button
      onClick={() => onTabChange(tab)}
      className={`flex-1 rounded-md py-2 text-xs font-bold transition ${activeTab === tab ? 'text-white bg-purple-600/80 shadow-[0_0_18px_rgba(124,58,237,0.18)]' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
    >
      {children}
    </button>
  )
}

function flowSpeedLabel(speed: FlowSpeed): string {
  const labels: Record<FlowSpeed, string> = {
    slow: 'lento',
    medium: 'médio',
    fast: 'rápido',
    very_fast: 'double time',
  }
  return labels[speed]
}

function lineFit(line: LineMetrics, average: number) {
  const diff = line.syllableCount - average

  if (line.syllableCount >= 20 || diff >= 6) {
    return {
      label: 'travada',
      hint: 'Pode precisar de pausa, corte ou double time.',
      className: 'bg-red-900/40 text-red-300 border-red-800',
      barClassName: 'bg-red-500',
    }
  }

  if (diff >= 3) {
    return {
      label: 'esticada',
      hint: 'Linha mais longa que o padrão da estrofe.',
      className: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
      barClassName: 'bg-yellow-500',
    }
  }

  if (diff <= -3) {
    return {
      label: 'curta',
      hint: 'Boa para pausa, resposta ou respiro.',
      className: 'bg-blue-900/40 text-blue-300 border-blue-800',
      barClassName: 'bg-blue-500',
    }
  }

  return {
    label: 'encaixada',
    hint: 'Perto da média métrica da estrofe.',
    className: 'bg-green-900/40 text-green-300 border-green-800',
    barClassName: 'bg-green-500',
  }
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' }) {
  const toneClass = {
    default: 'text-gray-200 border-[#2b2b36] bg-[#19191f]',
    good: 'text-green-300 border-green-800/60 bg-green-950/20',
    warn: 'text-yellow-300 border-yellow-800/60 bg-yellow-950/20',
  }[tone]

  return (
    <div className={`rounded-md border px-3 py-2.5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{label}</p>
      <p className="text-lg font-bold leading-tight mt-0.5">{value}</p>
    </div>
  )
}

function MetricsTab({ lines }: { lines: string[] }) {
  const analysis = analyzeMetrics(lines.join('\n'))

  if (analysis.lines.length === 0) {
    return (
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-bold">Flow Meter 2.0</h3>
        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">Escreva algumas barras para analisar o encaixe do flow.</p>
        </div>
      </div>
    )
  }

  const regularityTone = analysis.regularityScore >= 78 ? 'good' : analysis.regularityScore >= 55 ? 'default' : 'warn'
  const average = analysis.averageSyllables || 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Flow Meter 2.0</h3>
          <p className="text-[10px] text-gray-600 mt-1">Regularidade, respiro e densidade por barra.</p>
        </div>
        <span className="text-[10px] text-purple-300 border border-purple-800/50 bg-purple-950/30 px-2 py-1 rounded-full">
          {flowSpeedLabel(analysis.flowSpeed)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard label="Média" value={`${analysis.averageSyllables} síl.`} />
        <MetricCard label="Flow" value={flowSpeedLabel(analysis.flowSpeed)} tone={analysis.flowSpeed === 'very_fast' ? 'warn' : 'default'} />
        <MetricCard label="Barras" value={analysis.totalLines} />
        <MetricCard label="Regularidade" value={`${analysis.regularityScore}%`} tone={regularityTone} />
      </div>

      <div className="mb-4 rounded-md border border-[#2b2b36] bg-[#15151b] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Consistência</span>
          <span className="text-xs text-gray-300 font-semibold">{analysis.regularityScore}%</span>
        </div>
        <div className="h-2 bg-gray-900 rounded overflow-hidden">
          <div
            className={`h-full ${analysis.regularityScore >= 78 ? 'bg-green-500' : analysis.regularityScore >= 55 ? 'bg-purple-500' : 'bg-yellow-500'}`}
            style={{ width: `${analysis.regularityScore}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1">Regularidade compara a variação de sílabas entre as barras.</p>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="mb-4 space-y-1">
          {analysis.warnings.map((warning, index) => (
            <p key={index} className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-900/40 rounded px-2 py-1">
              {warning}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {analysis.lines.map((line, index) => {
          const fit = lineFit(line, average)
          const width = Math.max(8, Math.min(100, (line.syllableCount / Math.max(average + 8, 16)) * 100))
          const blockNumber = Math.floor(index / 4) + 1
          const positionInBlock = (index % 4) + 1

          return (
            <div key={index} className="bg-[#19191f] border border-[#2b2b36] p-3 rounded-md hover:border-purple-800/50 transition">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  Bloco {blockNumber}.{positionInBlock}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${fit.className}`}>
                    {fit.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#25252f] text-gray-300 font-bold">
                    {line.syllableCount} síl.
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-300 leading-snug line-clamp-2">"{line.text}"</p>

              <div className="h-2 bg-gray-950 rounded overflow-hidden mt-2">
                <div className={`h-full ${fit.barClassName}`} style={{ width: `${width}%` }} />
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-gray-500">{flowSpeedLabel(line.flowSpeed)}</span>
                {line.breathPoints.length > 0 && <span className="text-[10px] text-cyan-400">pausa sugerida</span>}
                {line.elisions.length > 0 && <span className="text-[10px] text-purple-400">{line.elisions.length} elisão</span>}
              </div>

              <p className="text-[10px] text-gray-600 mt-1">{fit.hint}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function schemeTone(type: string): string {
  if (type === 'free') return 'text-gray-400 border-gray-800 bg-gray-900/30'
  if (type === 'mixed') return 'text-yellow-300 border-yellow-800/60 bg-yellow-950/20'
  return 'text-purple-200 border-purple-700/60 bg-purple-950/30'
}

function RhymeSchemeBlockCard({ block }: { block: RhymeSchemeBlock }) {
  return (
    <div className="rounded-md border border-[#2b2b36] bg-[#17171d] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
          Bloco {Math.floor(block.startLine / 4) + 1}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black tracking-wider ${schemeTone(block.type)}`}>
          {block.type}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1">
        {block.labels.map((label, index) => (
          <div key={`${block.startLine}-${index}`} className="rounded border border-white/5 bg-black/20 px-1.5 py-2 text-center">
            <p className="text-[10px] text-gray-600 font-bold">L{block.startLine + index + 1}</p>
            <p className="text-lg font-black text-purple-200 leading-tight">{label ?? '-'}</p>
            <p className="text-[10px] text-gray-500 truncate">{block.endWords[index] || '...'}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-500 leading-snug mt-3">{block.description}</p>
    </div>
  )
}

function RhymeSchemePanel({ lines }: { lines: string[] }) {
  const analysis = analyzeRhymes(lines.join('\n'))

  if (analysis.endWords.length < 2) {
    return (
      <div className="rounded-md border border-[#2b2b36] bg-[#17171d] p-3 mb-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Esquema de rima</p>
        <p className="text-xs text-gray-600 mt-2">Escreva ao menos 2 linhas para detectar AABB, ABAB, ABCB e variações.</p>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <div className="rounded-md border border-purple-800/40 bg-purple-950/20 p-3 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Esquema de rima</p>
            <p className="text-[10px] text-gray-600 mt-1">Leitura por posição dos finais de linha.</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-black tracking-wider ${schemeTone(analysis.scheme)}`}>
            {analysis.scheme.toUpperCase()}
          </span>
        </div>
        <p className="font-mono text-xl text-white tracking-[0.18em] mt-3">{analysis.schemePattern || '----'}</p>
        <p className="text-[10px] text-gray-500 mt-1">
          Cada letra representa uma família fonética no fim da linha.
        </p>
      </div>

      <div className="space-y-2">
        {analysis.schemeBlocks.map(block => (
          <RhymeSchemeBlockCard key={`${block.startLine}-${block.pattern}`} block={block} />
        ))}
      </div>
    </div>
  )
}

function RhymesTab({ selectedWord, lines }: { selectedWord: string; lines: string[] }) {
  const rhymes = findRhymesTyped(selectedWord, 16)

  return (
    <div>
      <RhymeSchemePanel lines={lines} />

      <div className="mb-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Rimas</h3>
        <p className="text-sm text-gray-300 mt-1">
          Para: <span className="text-purple-300 font-semibold capitalize">{selectedWord || '...'}</span>
        </p>
      </div>
      {rhymes.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1 mb-4">
            {(['exact', 'approximate', 'assonance', 'rich', 'multisyllabic'] as const).map(type => {
              const count = rhymes.filter(rhyme => rhyme.type === type).length
              if (!count) return null
              return (
                <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${typeBadge[type]}`}>
                  {typeLabel[type]} {count}
                </span>
              )
            })}
          </div>
          <div className="space-y-1.5">
            {rhymes.map((rhyme: RhymeSuggestion, index: number) => (
              <div key={index} className="flex items-center justify-between bg-[#19191f] border border-[#2b2b36] px-3 py-2 rounded-md hover:border-purple-500/70 cursor-pointer transition group">
                <span className="text-sm text-gray-200 group-hover:text-white font-medium">{rhyme.word}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ml-2 flex-shrink-0 ${typeBadge[rhyme.type] ?? typeBadge.approximate}`}>
                  {typeLabel[rhyme.type] ?? rhyme.type}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">Clique em uma palavra no editor para ver sugestões de rima.</p>
          <p className="text-xs text-gray-600 mt-2">O motor fonético detecta rimas em português automaticamente.</p>
        </div>
      )}
    </div>
  )
}

function DictionarySection({ title, words, className, onInsertWord }: {
  title: string
  words: string[]
  className: string
  onInsertWord: (word: string) => void
}) {
  if (words.length === 0) return null

  return (
    <section>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word, index) => (
          <button
            key={`${word}-${index}`}
            onClick={() => onInsertWord(word)}
            title="Substituir no editor"
            className={`px-2.5 py-1 text-sm rounded-lg border transition ${className}`}
          >
            {word}
          </button>
        ))}
      </div>
    </section>
  )
}

function DictionaryTab({ selectedWord, dictResult, dictLoading, onInsertWord }: Pick<RightPanelProps, 'selectedWord' | 'dictResult' | 'dictLoading' | 'onInsertWord'>) {
  const hasResult = Boolean(
    dictResult &&
    (dictResult.girias.length > 0 || dictResult.sinonimos.length > 0 || dictResult.relacionados.length > 0 || dictResult.antonimos.length > 0),
  )

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Vocabulário</h3>
        <p className="text-sm text-gray-300 mt-1">
          Palavra: <span className="text-purple-300 font-semibold capitalize">{selectedWord || '...'}</span>
        </p>
      </div>

      {!selectedWord ? (
        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">Clique em uma palavra no editor para ver gírias, sinônimos, relacionados e antônimos.</p>
        </div>
      ) : dictLoading ? (
        <div className="text-center mt-10">
          <p className="text-xs text-gray-500 animate-pulse">Buscando vocabulário...</p>
        </div>
      ) : !hasResult ? (
        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">Sem resultados para</p>
          <p className="text-purple-400 font-semibold mt-1 capitalize">"{selectedWord}"</p>
          <p className="text-xs text-gray-600 mt-3">Tente: dinheiro, carro, amigo, fugir, estilo...</p>
        </div>
      ) : (
        <div className="space-y-5">
          <DictionarySection
            title="Gírias / Urbano"
            words={dictResult?.girias ?? []}
            onInsertWord={onInsertWord}
            className="bg-purple-900/20 text-purple-300 border-purple-700/50 hover:border-purple-400 hover:bg-purple-900/40"
          />
          <DictionarySection
            title="Sinônimos"
            words={dictResult?.sinonimos ?? []}
            onInsertWord={onInsertWord}
            className="bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500 hover:text-gray-100"
          />
          <DictionarySection
            title="Relacionados"
            words={dictResult?.relacionados ?? []}
            onInsertWord={onInsertWord}
            className="bg-cyan-950/25 text-cyan-300 border-cyan-800/40 hover:border-cyan-500 hover:bg-cyan-900/30"
          />
          <DictionarySection
            title="Antônimos"
            words={dictResult?.antonimos ?? []}
            onInsertWord={onInsertWord}
            className="bg-red-900/20 text-red-400 border-red-800/40 hover:border-red-600 hover:bg-red-900/30"
          />
          <p className="text-[10px] text-gray-700 pt-1">Clique para substituir no editor.</p>
        </div>
      )}
    </div>
  )
}

export function RightPanel({ activeTab, selectedWord, lines, dictResult, dictLoading, onTabChange, onInsertWord }: RightPanelProps) {
  return (
    <div className="w-[22rem] min-w-[20rem] bg-[#131317] border-l border-[#262631] flex flex-col relative">
      <div className="h-16 border-b border-[#262631] flex items-center justify-between px-4 bg-[#151519] app-region-drag">
        <div>
          <span className="text-xs text-gray-500 font-bold tracking-wider">FERRAMENTAS LÍRICAS</span>
          <p className="text-[10px] text-gray-600 mt-1">Métrica, rimas e vocabulário</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.55)]" />
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-[#262631] bg-[#101014] p-2">
        <TabButton tab="metrics" activeTab={activeTab} onTabChange={onTabChange}>Métrica</TabButton>
        <TabButton tab="rhymes" activeTab={activeTab} onTabChange={onTabChange}>Rimas</TabButton>
        <TabButton tab="dictionary" activeTab={activeTab} onTabChange={onTabChange}>Dicionário</TabButton>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'metrics' && <MetricsTab lines={lines} />}
        {activeTab === 'rhymes' && <RhymesTab selectedWord={selectedWord} lines={lines} />}
        {activeTab === 'dictionary' && (
          <DictionaryTab
            selectedWord={selectedWord}
            dictResult={dictResult}
            dictLoading={dictLoading}
            onInsertWord={onInsertWord}
          />
        )}
      </div>
    </div>
  )
}
