// src/features/metrics/MetricsService.ts
// Serviço de análise de métrica, escansão e flow para PT-BR
//
// LIMITAÇÃO: Escansão perfeita exige análise linguística avançada.
// MVP usa heurística prática suficiente para composição musical.

import { MetricsAnalysis, LineMetrics, FlowSpeed } from '../../shared/types/Metrics'
import { countLineSyllables } from './syllableUtils'
import { estimateStressWords, suggestBreathPoints } from './stressUtils'
import { detectElisions } from './elisionUtils'

// Referências de sílabas por estilo (por verso)
const FLOW_THRESHOLDS = {
  slow: { min: 0, max: 9 },      // trap melódico lento
  medium: { min: 10, max: 14 },  // trap clássico / boombap
  fast: { min: 15, max: 19 },    // drill / rap denso
  very_fast: { min: 20, max: Infinity } // double time
}

/**
 * Analisa métricas de um texto completo linha por linha
 */
export function analyzeMetrics(text: string): MetricsAnalysis {
  const rawLines = text.split('\n').map(l => l.trim())
  const contentLines = rawLines.filter(Boolean)

  if (contentLines.length === 0) {
    return emptyMetrics()
  }

  const lineMetrics: LineMetrics[] = contentLines.map((line, idx) => analyzeLine(line, idx))

  const totalSyllables = lineMetrics.reduce((s, l) => s + l.syllableCount, 0)
  const totalWords = contentLines.join(' ').split(/\s+/).filter(Boolean).length
  const averageSyllables = lineMetrics.length > 0 ? totalSyllables / lineMetrics.length : 0

  const regularityScore = calculateRegularityScore(lineMetrics.map(l => l.syllableCount))
  const flowSpeed = estimateOverallFlow(averageSyllables)
  const warnings = generateWarnings(lineMetrics, averageSyllables)

  const sorted = [...lineMetrics].sort((a, b) => b.syllableCount - a.syllableCount)
  const longestLine = sorted[0] || null
  const shortestLine = sorted[sorted.length - 1] || null

  return {
    lines: lineMetrics,
    averageSyllables: Math.round(averageSyllables * 10) / 10,
    regularityScore,
    flowSpeed,
    totalLines: contentLines.length,
    totalWords,
    totalSyllables,
    warnings,
    longestLine,
    shortestLine
  }
}

/**
 * Analisa uma linha individualmente
 */
export function analyzeLine(line: string, lineIndex: number): LineMetrics {
  const syllableCount = countLineSyllables(line)
  const estimatedStressWords = estimateStressWords(line)
  const breathPoints = suggestBreathPoints(line, syllableCount)
  const elisions = detectElisions(line)
  const flowSpeed = estimateLineFlow(syllableCount)

  const isTooLong = syllableCount > 20
  const isTooShort = syllableCount < 5 && line.split(/\s+/).length > 2

  const suggestions = generateLineSuggestions(syllableCount, isTooLong, isTooShort, flowSpeed)

  return {
    lineIndex,
    text: line,
    syllableCount,
    estimatedStressWords,
    breathPoints,
    isTooLong,
    isTooShort,
    flowSpeed,
    suggestions,
    elisions: elisions.map(e => e.description)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateLineFlow(syllables: number): FlowSpeed {
  if (syllables >= FLOW_THRESHOLDS.very_fast.min) return 'very_fast'
  if (syllables >= FLOW_THRESHOLDS.fast.min) return 'fast'
  if (syllables >= FLOW_THRESHOLDS.medium.min) return 'medium'
  return 'slow'
}

function estimateOverallFlow(avgSyllables: number): FlowSpeed {
  return estimateLineFlow(Math.round(avgSyllables))
}

/**
 * Score de regularidade: 100 = todos os versos iguais, 0 = caótico
 * Baseado no coeficiente de variação (desvio/média)
 */
function calculateRegularityScore(syllableCounts: number[]): number {
  if (syllableCounts.length < 2) return 100

  const mean = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length
  if (mean === 0) return 0

  const variance = syllableCounts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / syllableCounts.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / mean // coeficiente de variação

  // CV baixo = regular; converter para 0-100
  const score = Math.max(0, Math.min(100, 100 - cv * 100))
  return Math.round(score)
}

function generateLineSuggestions(
  syllableCount: number,
  isTooLong: boolean,
  isTooShort: boolean,
  flowSpeed: FlowSpeed
): string[] {
  const suggestions: string[] = []

  if (isTooLong) {
    suggestions.push(`Linha longa (${syllableCount} síl) — considere dividir em 2 ou usar double time`)
  }
  if (isTooShort && syllableCount > 0) {
    suggestions.push(`Linha curta (${syllableCount} síl) — boa para pausa ou refrão minimalista`)
  }
  if (flowSpeed === 'very_fast') {
    suggestions.push('Atenção ao flow rápido — garanta que o beat suporte esta densidade')
  }

  return suggestions
}

function generateWarnings(lines: LineMetrics[], avg: number): string[] {
  const warnings: string[] = []

  const longLines = lines.filter(l => l.isTooLong).length
  if (longLines > lines.length * 0.4) {
    warnings.push('Muitas linhas longas — verifique se o flow cabe no beat')
  }

  const variance = lines.map(l => l.syllableCount)
  const maxSyl = Math.max(...variance)
  const minSyl = Math.min(...variance)
  if (maxSyl - minSyl > 12) {
    warnings.push('Alta variação métrica — pode soar inconsistente no beat')
  }

  return warnings
}

export function scoreBreathLoad(lines: LineMetrics[]): number {
  if (lines.length === 0) return 0
  const forced = lines.filter(l => l.syllableCount >= 15 && l.breathPoints.length === 0).length
  return Math.max(0, Math.min(100, Math.round(100 - (forced / lines.length) * 80)))
}

export function scoreBlockConsistency(lines: LineMetrics[]): number {
  if (lines.length < 2) return 100
  const blocks: number[][] = []
  for (let i = 0; i < lines.length; i += 4) {
    const block = lines.slice(i, i + 4).map(l => l.syllableCount)
    if (block.length > 1) blocks.push(block)
  }
  if (blocks.length === 0) return 100
  const blockScores = blocks.map(block => {
    const mean = block.reduce((a, b) => a + b, 0) / block.length
    if (mean === 0) return 0
    const variance = block.reduce((sum, c) => sum + (c - mean) ** 2, 0) / block.length
    const cv = Math.sqrt(variance) / mean
    return Math.max(0, Math.min(100, Math.round(100 - cv * 100)))
  })
  return Math.round(blockScores.reduce((a, b) => a + b, 0) / blockScores.length)
}

export function generateLineAlerts(line: LineMetrics, average: number): string[] {
  const alerts: string[] = []
  const diff = line.syllableCount - average

  if (line.syllableCount >= 22) {
    alerts.push(`${line.syllableCount} síl — double time ou divida`)
  } else if (line.syllableCount >= 20) {
    alerts.push(`${line.syllableCount} síl — muito longa`)
  } else if (diff >= 5) {
    alerts.push(`+${Math.round(diff)} síl acima da média`)
  }

  if (line.isTooShort) alerts.push('muito curta')

  if (line.syllableCount >= 15 && line.breathPoints.length === 0) {
    alerts.push('sem respiro — risco de rush')
  }

  if (line.flowSpeed === 'very_fast' && line.syllableCount < 22) {
    alerts.push('duplo tempo')
  }

  return alerts
}

function emptyMetrics(): MetricsAnalysis {
  return {
    lines: [],
    averageSyllables: 0,
    regularityScore: 0,
    flowSpeed: 'medium',
    totalLines: 0,
    totalWords: 0,
    totalSyllables: 0,
    warnings: [],
    longestLine: null,
    shortestLine: null
  }
}
