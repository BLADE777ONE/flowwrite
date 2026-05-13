import { useState, useEffect, type ReactNode } from 'react'
import { analyzeRhymes, findRhymesTyped, type RhymeSuggestion } from '../../features/rhyme/RhymeService'
import { analyzeMetrics, scoreBreathLoad, scoreBlockConsistency, generateLineAlerts } from '../../features/metrics/MetricsService'
import { getRhymeStrength, getPredictableEndingLabel, type RhymeStrength } from '../../features/rhyme/rhymeScoring'
import { generateGhostwriterSuggestion } from '../../features/insights/GhostwriterService'
import type { FlowSpeed, LineMetrics } from '../../shared/types/Metrics'
import type { DictionaryResult } from '../../features/dictionary/DictionaryService'
import type { ActiveToolTab } from '../types'
import type { RhymeAnalysis, RhymeSchemeBlock } from '../../shared/types/Rhyme'

interface RightPanelProps {
  activeTab: ActiveToolTab
  selectedWord: string
  lines: string[]
  dictResult: DictionaryResult | null
  dictLoading: boolean
  onTabChange: (tab: ActiveToolTab) => void
  onInsertWord: (word: string) => void
  onInsertLine: (line: string) => void
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
      className={`flex-1 rounded-md py-2 text-[11px] font-black transition ${activeTab === tab ? 'text-white bg-purple-600/80 shadow-[0_0_18px_rgba(124,58,237,0.24)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}
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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function flowMeterLabel(score: number): string {
  if (score >= 90) return 'EXCELENTE'
  if (score >= 78) return 'FORTE'
  if (score >= 62) return 'BOM'
  return 'AJUSTAR'
}

function scoreAverageTarget(average: number): number {
  if (!average) return 0
  return clampPercent(100 - Math.abs(average - 13) * 7)
}

function scoreLineFit(lines: LineMetrics[], average: number): number {
  if (lines.length === 0) return 0
  const fitted = lines.filter(line => {
    const diff = Math.abs(line.syllableCount - average)
    return !line.isTooLong && !line.isTooShort && diff <= 3.5
  }).length
  return clampPercent((fitted / lines.length) * 100)
}

function scoreRhythm(lines: LineMetrics[], regularity: number): number {
  if (lines.length === 0) return 0
  const heavyLines = lines.filter(line => line.isTooLong || line.flowSpeed === 'very_fast').length
  const breathLoad = lines.filter(line => line.breathPoints.length > 0).length
  return clampPercent(regularity - heavyLines * 8 - breathLoad * 2 + 8)
}

function MetricProgressRow({ label, value, tone }: { label: string; value: number; tone: 'purple' | 'cyan' | 'green' | 'pink' }) {
  const colorClass = {
    purple: 'from-purple-600 to-fuchsia-400',
    cyan: 'from-cyan-500 to-sky-300',
    green: 'from-emerald-500 to-lime-300',
    pink: 'from-fuchsia-500 to-pink-300',
  }[tone]

  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.03] p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-black">{label}</span>
        <span className="text-xs text-gray-200 font-mono font-bold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function FlowMeterDial({
  score,
  speed,
  fit,
  metric,
  rhythm,
  breath,
}: {
  score: number
  speed: number
  fit: number
  metric: number
  rhythm: number
  breath: number
}) {
  const circumference = 2 * Math.PI * 48
  const rings = [
    { value: metric, radius: 48, stroke: '#a855f7', width: 6 },
    { value: speed, radius: 40, stroke: '#22d3ee', width: 5 },
    { value: fit, radius: 33, stroke: '#34d399', width: 4 },
    { value: rhythm, radius: 26, stroke: '#f472b6', width: 3 },
    { value: breath, radius: 20, stroke: '#fb923c', width: 3 },
  ]

  return (
    <div className="rounded-lg border border-purple-500/20 bg-[radial-gradient(circle_at_50%_20%,rgba(147,51,234,0.18),rgba(12,12,17,0.92)_58%)] p-4 shadow-[0_0_36px_rgba(124,58,237,0.16)]">
      <div className="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 overflow-visible">
          {rings.map(ring => {
            const ringCircumference = 2 * Math.PI * ring.radius
            return (
              <g key={`${ring.radius}-${ring.stroke}`}>
                <circle
                  cx="60"
                  cy="60"
                  r={ring.radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={ring.width}
                />
                <circle
                  cx="60"
                  cy="60"
                  r={ring.radius}
                  fill="none"
                  stroke={ring.stroke}
                  strokeWidth={ring.width}
                  strokeLinecap="round"
                  strokeDasharray={`${(ring.value / 100) * ringCircumference} ${ringCircumference}`}
                  className="drop-shadow-[0_0_8px_rgba(168,85,247,0.65)]"
                />
              </g>
            )
          })}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
            strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-5xl font-black text-white tracking-tight">{score}</p>
          <p className="text-[10px] text-gray-500 font-black tracking-[0.22em]">/100</p>
          <p className="mt-1 text-[10px] text-cyan-300 font-black tracking-[0.22em]">{flowMeterLabel(score)}</p>
        </div>
      </div>
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

  const average = analysis.averageSyllables || 0
  const speedScore = scoreAverageTarget(average)
  const fitScore = scoreLineFit(analysis.lines, average)
  const metricScore = clampPercent(analysis.regularityScore)
  const rhythmScore = scoreRhythm(analysis.lines, analysis.regularityScore)
  const breathScore = scoreBreathLoad(analysis.lines)
  const blockScore = scoreBlockConsistency(analysis.lines)
  const flowScore = clampPercent(
    metricScore * 0.35 + fitScore * 0.22 + speedScore * 0.18 +
    rhythmScore * 0.12 + breathScore * 0.08 + blockScore * 0.05,
  )

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

      <div className="mb-4">
        <FlowMeterDial
          score={flowScore}
          speed={speedScore}
          fit={fitScore}
          metric={metricScore}
          rhythm={rhythmScore}
          breath={breathScore}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard label="Média" value={`${analysis.averageSyllables} síl.`} />
        <MetricCard label="Flow" value={flowSpeedLabel(analysis.flowSpeed)} tone={analysis.flowSpeed === 'very_fast' ? 'warn' : 'default'} />
        <MetricCard label="Barras" value={analysis.totalLines} />
        <MetricCard label="Score" value={`${flowScore}%`} tone={flowScore >= 82 ? 'good' : flowScore >= 64 ? 'default' : 'warn'} />
      </div>

      <div className="mb-4 space-y-2">
        <MetricProgressRow label="Velocidade" value={speedScore} tone="cyan" />
        <MetricProgressRow label="Encaixe" value={fitScore} tone="purple" />
        <MetricProgressRow label="Métrica" value={metricScore} tone="green" />
        <MetricProgressRow label="Ritmo das barras" value={rhythmScore} tone="pink" />
        <MetricProgressRow label="Respiro" value={breathScore} tone="cyan" />
        <MetricProgressRow label="Consistência de bloco" value={blockScore} tone="green" />
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
          const alerts = generateLineAlerts(line, average)

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

              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {alerts.map((alert, ai) => (
                    <span key={ai} className="text-[10px] px-1.5 py-0.5 rounded border bg-orange-950/30 text-orange-300 border-orange-800/40 font-bold">
                      {alert}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-gray-600 mt-1">{fit.hint}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const STRENGTH_STYLES: Record<RhymeStrength, { badge: string; bar: string; label: string }> = {
  forte:    { badge: 'bg-green-900/40 text-green-300 border-green-800',    bar: 'bg-green-500',   label: 'FORTE'    },
  criativa: { badge: 'bg-purple-900/40 text-purple-300 border-purple-800', bar: 'bg-purple-500',  label: 'CRIATIVA' },
  mediana:  { badge: 'bg-blue-900/40 text-blue-300 border-blue-800',      bar: 'bg-blue-500',    label: 'MEDIANA'  },
  fraca:    { badge: 'bg-gray-800 text-gray-500 border-gray-700',         bar: 'bg-gray-600',    label: 'FRACA'    },
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
          Estrofe {block.stanzaIndex + 1}.{block.blockIndex + 1}
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

function RhymeSchemePanel({ analysis }: { analysis: RhymeAnalysis }) {
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

function ChainAnalysisPanel({ analysis }: { analysis: RhymeAnalysis }) {
  if (analysis.chains.length === 0) return null

  const chainData = analysis.chains.map((chain) => {
    const chainMatches = analysis.matches.filter(
      (m) => chain.lines.includes(m.sourceLine) && chain.lines.includes(m.targetLine),
    )
    const avgScore = chainMatches.length > 0
      ? chainMatches.reduce((s, m) => s + m.score, 0) / chainMatches.length
      : 0.5
    const topMatch = chainMatches.length > 0
      ? [...chainMatches].sort((a, b) => b.score - a.score)[0]
      : null
    const strength = getRhymeStrength(avgScore, topMatch?.type ?? 'approximate')
    const repWord = chain.words[0] ?? ''
    const predictable = repWord ? getPredictableEndingLabel(repWord) : null
    const upgrades = (strength === 'fraca' || Boolean(predictable)) && repWord
      ? findRhymesTyped(repWord, 8)
          .filter((r) => r.type === 'exact' || r.type === 'rich' || r.type === 'multisyllabic')
          .slice(0, 5)
      : []

    return { chain, strength, avgScore, predictable, upgrades }
  })

  return (
    <div className="mb-5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Cadeias de rima</p>
      <div className="space-y-2">
        {chainData.map(({ chain, strength, avgScore, predictable, upgrades }) => {
          const style = STRENGTH_STYLES[strength]
          return (
            <div key={chain.id} className="rounded-md border border-[#2b2b36] bg-[#17171d] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black"
                  style={{ backgroundColor: chain.color + '30', border: `1.5px solid ${chain.color}`, color: chain.color }}
                >
                  {chain.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${style.bar}`}
                    style={{ width: `${Math.round(avgScore * 100)}%` }}
                  />
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-black tracking-wider flex-shrink-0 ${style.badge}`}>
                  {style.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-1.5">
                {chain.words.slice(0, 6).map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    className="text-[10px] px-1.5 py-0.5 rounded border bg-white/5 border-white/10 text-gray-300 font-mono"
                  >
                    {word}
                  </span>
                ))}
                {chain.words.length > 6 && (
                  <span className="text-[10px] text-gray-600">+{chain.words.length - 6}</span>
                )}
              </div>

              {predictable && (
                <p className="text-[10px] text-yellow-400 bg-yellow-900/20 border border-yellow-900/30 rounded px-2 py-1 mb-1.5">
                  {predictable}
                </p>
              )}

              {upgrades.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-600 mb-1">Alternativas mais fortes:</p>
                  <div className="flex flex-wrap gap-1">
                    {upgrades.map((r, i) => (
                      <span
                        key={`${r.word}-${i}`}
                        className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-950/30 text-purple-300 border-purple-800/50 font-mono"
                      >
                        {r.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RhymesTab({ selectedWord, lines }: { selectedWord: string; lines: string[] }) {
  const rhymes = findRhymesTyped(selectedWord, 48)
  const analysis = analyzeRhymes(lines.join('\n'))

  return (
    <div>
      <RhymeSchemePanel analysis={analysis} />
      <ChainAnalysisPanel analysis={analysis} />

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

interface UserWord {
  id: string
  word: string
  category: string
  note?: string | null
  createdAt: string
}

type WordCategory = 'giria' | 'sinonimo' | 'rima' | 'custom'

const CATEGORY_LABELS: Record<WordCategory, string> = {
  giria: 'Gírias',
  sinonimo: 'Sinônimos',
  rima: 'Rimas',
  custom: 'Outros',
}

const CATEGORY_STYLES: Record<WordCategory, string> = {
  giria:    'bg-purple-900/20 text-purple-300 border-purple-700/50',
  sinonimo: 'bg-gray-800 text-gray-300 border-gray-700',
  rima:     'bg-cyan-950/25 text-cyan-300 border-cyan-800/40',
  custom:   'bg-yellow-900/20 text-yellow-300 border-yellow-800/40',
}

function DictionaryTab({ selectedWord, dictResult, dictLoading, onInsertWord }: Pick<RightPanelProps, 'selectedWord' | 'dictResult' | 'dictLoading' | 'onInsertWord'>) {
  const [userWords, setUserWords] = useState<UserWord[]>([])
  const [newWord, setNewWord] = useState('')
  const [newCategory, setNewCategory] = useState<WordCategory>('giria')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!window.flowAPI) return
    window.flowAPI.invoke('userword:list').then((data) => {
      setUserWords(data as UserWord[])
    }).catch(() => {})
  }, [])

  async function handleAddWord() {
    const word = newWord.trim()
    if (!word || !window.flowAPI) return
    setSaving(true)
    try {
      const added = await window.flowAPI.invoke('userword:add', { word, category: newCategory }) as UserWord
      setUserWords(prev => [added, ...prev.filter(w => !(w.word === added.word && w.category === added.category))])
      setNewWord('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.flowAPI) return
    await window.flowAPI.invoke('userword:delete', id)
    setUserWords(prev => prev.filter(w => w.id !== id))
  }

  const hasResult = Boolean(
    dictResult &&
    (dictResult.girias.length > 0 || dictResult.sinonimos.length > 0 || dictResult.relacionados.length > 0 || dictResult.antonimos.length > 0),
  )

  return (
    <div>
      {/* ── Vocabulário externo (palavra selecionada) ── */}
      <div className="mb-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Vocabulário</h3>
        <p className="text-sm text-gray-300 mt-1">
          Palavra: <span className="text-purple-300 font-semibold capitalize">{selectedWord || '...'}</span>
        </p>
      </div>

      {!selectedWord ? (
        <div className="text-center mt-6 mb-6">
          <p className="text-sm text-gray-500">Clique em uma palavra no editor para ver gírias, sinônimos, relacionados e antônimos.</p>
        </div>
      ) : dictLoading ? (
        <div className="text-center mt-6 mb-6">
          <p className="text-xs text-gray-500 animate-pulse">Buscando vocabulário...</p>
        </div>
      ) : !hasResult ? (
        <div className="text-center mt-4 mb-6">
          <p className="text-sm text-gray-500">Sem resultados para</p>
          <p className="text-purple-400 font-semibold mt-1 capitalize">"{selectedWord}"</p>
          <p className="text-xs text-gray-600 mt-3">Tente: dinheiro, carro, amigo, fugir, estilo...</p>
        </div>
      ) : (
        <div className="space-y-5 mb-6">
          <DictionarySection title="Gírias / Urbano" words={dictResult?.girias ?? []} onInsertWord={onInsertWord}
            className="bg-purple-900/20 text-purple-300 border-purple-700/50 hover:border-purple-400 hover:bg-purple-900/40" />
          <DictionarySection title="Sinônimos" words={dictResult?.sinonimos ?? []} onInsertWord={onInsertWord}
            className="bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500 hover:text-gray-100" />
          <DictionarySection title="Relacionados" words={dictResult?.relacionados ?? []} onInsertWord={onInsertWord}
            className="bg-cyan-950/25 text-cyan-300 border-cyan-800/40 hover:border-cyan-500 hover:bg-cyan-900/30" />
          <DictionarySection title="Antônimos" words={dictResult?.antonimos ?? []} onInsertWord={onInsertWord}
            className="bg-red-900/20 text-red-400 border-red-800/40 hover:border-red-600 hover:bg-red-900/30" />
          <p className="text-[10px] text-gray-700 pt-1">Clique para substituir no editor.</p>
        </div>
      )}

      {/* ── Meu Dicionário ── */}
      <div className="border-t border-white/[0.06] pt-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Meu Dicionário</h3>

        {/* Quick-add */}
        {selectedWord && (
          <button
            onClick={() => setNewWord(selectedWord)}
            className="text-[10px] text-purple-400 hover:text-purple-300 transition mb-2 block"
          >
            + Salvar "{selectedWord}" no dicionário
          </button>
        )}
        <div className="flex gap-1 mb-4">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
            placeholder="nova palavra..."
            className="flex-1 min-w-0 bg-[#19191f] border border-[#2b2b36] focus:border-purple-700/60 rounded px-2 py-1.5 text-xs text-gray-200 outline-none transition"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as WordCategory)}
            className="bg-[#19191f] border border-[#2b2b36] rounded px-1.5 py-1 text-xs text-gray-300 outline-none"
          >
            <option value="giria">gíria</option>
            <option value="sinonimo">sinônimo</option>
            <option value="rima">rima</option>
            <option value="custom">outro</option>
          </select>
          <button
            onClick={handleAddWord}
            disabled={saving || !newWord.trim()}
            className="bg-purple-700/60 hover:bg-purple-600/70 disabled:opacity-40 text-white text-sm font-bold px-3 py-1 rounded transition"
          >
            +
          </button>
        </div>

        {/* Words grouped by category */}
        {userWords.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">Nenhuma palavra salva ainda.</p>
        ) : (
          <div className="space-y-4">
            {(['giria', 'sinonimo', 'rima', 'custom'] as WordCategory[]).map((cat) => {
              const catWords = userWords.filter(w => w.category === cat)
              if (catWords.length === 0) return null
              return (
                <div key={cat}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1.5">
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {catWords.map((w) => (
                      <div
                        key={w.id}
                        className={`flex items-center gap-1 rounded border px-2 py-1 group transition ${CATEGORY_STYLES[cat as WordCategory]}`}
                      >
                        <button
                          onClick={() => onInsertWord(w.word)}
                          className="text-xs font-medium hover:brightness-125 transition"
                        >
                          {w.word}
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="text-[11px] leading-none text-current opacity-0 group-hover:opacity-50 hover:!opacity-100 transition ml-0.5"
                          title="Remover"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantTab({ lines, onInsertLine }: Pick<RightPanelProps, 'lines' | 'onInsertLine'>) {
  const text = lines.join('\n').trim()
  const contentLines = lines.map(line => line.trim()).filter(Boolean)

  if (contentLines.length < 2) {
    return (
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Assistente de Verso</h3>
        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">Escreva ao menos 2 linhas para o app entender seu desenho de rima.</p>
        </div>
      </div>
    )
  }

  const rhymeAnalysis = analyzeRhymes(text)
  const metricsAnalysis = analyzeMetrics(text)
  const suggestion = generateGhostwriterSuggestion(text, rhymeAnalysis, metricsAnalysis)
  const lastBlock = rhymeAnalysis.schemeBlocks.at(-1)

  if (!suggestion) {
    return (
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Assistente de Verso</h3>
        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">Continue escrevendo para gerar um alvo de próxima linha.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Assistente de Verso</h3>
        <p className="text-[10px] text-gray-600 mt-1">Sugestões locais baseadas no seu esquema e na métrica atual.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard label="Alvo" value={suggestion.nextRhymeClass ?? 'livre'} />
        <MetricCard label="Sílabas" value={`~${suggestion.targetSyllables}`} />
        <MetricCard label="Flow" value={flowSpeedLabel(suggestion.flowSpeed)} />
      </div>

      {lastBlock && (
        <div className="rounded-md border border-purple-800/40 bg-purple-950/20 p-3 mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Leitura atual</p>
          <p className="font-mono text-lg text-white tracking-[0.18em] mt-2">{lastBlock.pattern}</p>
          <p className="text-[10px] text-gray-500 mt-1">
            Próximo fechamento sugerido: família {suggestion.nextRhymeClass ?? 'livre'}.
          </p>
        </div>
      )}

      <section className="mb-5">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Fechamentos possíveis</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestion.rhymeOptions.map((word, index) => (
            <button
              key={`${word}-${index}`}
              onClick={() => onInsertLine(word)}
              className="px-2.5 py-1 text-sm rounded-lg border bg-purple-900/20 text-purple-300 border-purple-700/50 hover:border-purple-400 hover:bg-purple-900/40 transition"
              title="Inserir como nova linha"
            >
              {word}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Moldes de próxima barra</p>
        <div className="space-y-2">
          {suggestion.templateStarters.map((line, index) => (
            <button
              key={`${line}-${index}`}
              onClick={() => onInsertLine(line)}
              className="w-full text-left rounded-md border border-[#2b2b36] bg-[#19191f] px-3 py-2 text-xs text-gray-300 hover:border-purple-700/70 hover:text-white transition"
            >
              {line}
            </button>
          ))}
        </div>
      </section>

      {suggestion.styleHints.length > 0 && (
        <section>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Dicas de ajuste</p>
          <div className="space-y-1.5">
            {suggestion.styleHints.map((hint, index) => (
              <p key={index} className="text-xs text-gray-400 bg-[#19191f] border border-[#2b2b36] rounded-md px-3 py-2">
                {hint}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function RightPanel({ activeTab, selectedWord, lines, dictResult, dictLoading, onTabChange, onInsertWord, onInsertLine }: RightPanelProps) {
  return (
    <aside className="w-[21rem] min-w-[19.5rem] bg-[#08080c] border-l border-white/[0.07] flex flex-col relative shadow-[-12px_0_36px_rgba(0,0,0,0.2)]">
      <div className="h-16 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[#0c0c11] app-region-drag">
        <div>
          <span className="text-xs text-gray-500 font-bold tracking-wider">FERRAMENTAS LÍRICAS</span>
          <p className="text-[10px] text-gray-600 mt-1">Métrica, rimas e vocabulário</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.55)]" />
      </div>

      <div className="grid grid-cols-4 gap-1 border-b border-white/[0.06] bg-black/30 p-2">
        <TabButton tab="metrics" activeTab={activeTab} onTabChange={onTabChange}>Métrica</TabButton>
        <TabButton tab="rhymes" activeTab={activeTab} onTabChange={onTabChange}>Rimas</TabButton>
        <TabButton tab="dictionary" activeTab={activeTab} onTabChange={onTabChange}>Dicionário</TabButton>
        <TabButton tab="assistant" activeTab={activeTab} onTabChange={onTabChange}>Assist.</TabButton>
      </div>

      <div className="p-4 flex-1 overflow-y-auto editor-scroll">
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
        {activeTab === 'assistant' && <AssistantTab lines={lines} onInsertLine={onInsertLine} />}
      </div>
    </aside>
  )
}
