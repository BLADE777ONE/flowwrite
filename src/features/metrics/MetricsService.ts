// src/features/metrics/MetricsService.ts
// Serviço de análise de métrica, escansão e flow para PT-BR.
// A leitura é probabilística: letra escrita não é a mesma coisa que performance vocal.

import { MetricsAnalysis, LineMetrics, FlowSpeed, MetricsAnalysisMode } from '../../shared/types/Metrics'
import { countLineSyllables } from './syllableUtils'
import { estimateStressWords, suggestBreathPoints } from './stressUtils'
import { detectElisions } from './elisionUtils'

interface ModeProfile {
  mode: MetricsAnalysisMode
  label: string
  idealMin: number
  idealMax: number
  tolerance: number
  varianceLimit: number
  breathBase: number
  note: string
}

const MODE_PROFILES: Record<MetricsAnalysisMode, ModeProfile> = {
  rap: {
    mode: 'rap',
    label: 'Rap reto',
    idealMin: 10,
    idealMax: 14,
    tolerance: 2,
    varianceLimit: 12,
    breathBase: 1350,
    note: 'Leitura firme por barra; boa para boom bap e rap cadenciado.',
  },
  trap: {
    mode: 'trap',
    label: 'Trap / Triplet',
    idealMin: 8,
    idealMax: 12,
    tolerance: 2,
    varianceLimit: 10,
    breathBase: 1220,
    note: 'Valoriza bounce, tercinas e espaços vazios no pocket.',
  },
  melodic: {
    mode: 'melodic',
    label: 'Melódico / R&B',
    idealMin: 6,
    idealMax: 14,
    tolerance: 5,
    varianceLimit: 17,
    breathBase: 1650,
    note: 'Mais tolerante a prolongamento de vogal, elisão e variação melódica.',
  },
  free: {
    mode: 'free',
    label: 'Livre',
    idealMin: 4,
    idealMax: 18,
    tolerance: 8,
    varianceLimit: 22,
    breathBase: 1800,
    note: 'Leitura aberta para freestyle, spoken word e trechos sem compasso rígido.',
  },
}

const FLOW_THRESHOLDS = {
  slow: { min: 0, max: 9 },
  medium: { min: 10, max: 14 },
  fast: { min: 15, max: 19 },
  very_fast: { min: 20, max: Infinity },
}

function getProfile(mode: MetricsAnalysisMode, bpm: number): ModeProfile {
  const profile = MODE_PROFILES[mode]
  if (mode !== 'rap') return profile

  if (bpm >= 130) return MODE_PROFILES.trap
  if (bpm >= 110 && bpm < 130) {
    return { ...profile, label: 'Plug / Rap leve', idealMin: 6, idealMax: 10, tolerance: 3, varianceLimit: 14 }
  }
  return profile
}

export function getMetricsModeProfile(mode: MetricsAnalysisMode, bpm = 90): ModeProfile {
  return getProfile(mode, bpm)
}

export function analyzeMetrics(text: string, bpm = 90, mode: MetricsAnalysisMode = 'rap'): MetricsAnalysis {
  const rawLines = text.split('\n').map(l => l.trim())
  const contentLines = rawLines.filter(Boolean)
  const profile = getProfile(mode, bpm)

  if (contentLines.length === 0) {
    return emptyMetrics(mode, profile)
  }

  const lineMetrics = contentLines.map((line, idx) => analyzeLine(line, idx, bpm, mode))
  const totalSyllables = lineMetrics.reduce((s, l) => s + l.syllableCount, 0)
  const totalWords = contentLines.join(' ').split(/\s+/).filter(Boolean).length
  const averageSyllables = lineMetrics.length > 0 ? totalSyllables / lineMetrics.length : 0

  const regularityScore = calculateRegularityScore(lineMetrics.map(l => l.vocalSyllableEstimate ?? l.syllableCount), mode)
  const flowSpeed = estimateOverallFlow(averageSyllables)
  const warnings = generateWarnings(lineMetrics, averageSyllables, profile)
  const sorted = [...lineMetrics].sort((a, b) => b.syllableCount - a.syllableCount)

  return {
    mode,
    modeLabel: profile.label,
    idealRange: { min: profile.idealMin, max: profile.idealMax },
    lines: lineMetrics,
    averageSyllables: Math.round(averageSyllables * 10) / 10,
    regularityScore,
    flowSpeed,
    totalLines: contentLines.length,
    totalWords,
    totalSyllables,
    warnings,
    longestLine: sorted[0] || null,
    shortestLine: sorted[sorted.length - 1] || null,
  }
}

export function analyzeLine(line: string, lineIndex: number, bpm = 90, mode: MetricsAnalysisMode = 'rap'): LineMetrics {
  const profile = getProfile(mode, bpm)
  const syllableCount = countLineSyllables(line)
  const elisions = detectElisions(line)
  const vocalSyllableEstimate = Math.max(1, syllableCount - Math.min(elisions.length, mode === 'melodic' ? 3 : 2))
  const estimatedStressWords = estimateStressWords(line)
  const breathPoints = suggestBreathPoints(line, syllableCount)
  const flowSpeed = estimateLineFlow(syllableCount)
  const hardMax = profile.idealMax + profile.tolerance
  const hardMin = Math.max(1, profile.idealMin - profile.tolerance)
  const isTooLong = vocalSyllableEstimate > hardMax
  const isTooShort = vocalSyllableEstimate < hardMin && line.split(/\s+/).length > 2
  const fitConfidence = getFitConfidence(vocalSyllableEstimate, profile)
  const performanceNotes = buildPerformanceNotes(mode, syllableCount, vocalSyllableEstimate, elisions.length)
  const suggestions = generateLineSuggestions(syllableCount, vocalSyllableEstimate, isTooLong, isTooShort, flowSpeed, mode)

  return {
    lineIndex,
    text: line,
    syllableCount,
    vocalSyllableEstimate,
    fitConfidence,
    estimatedStressWords,
    breathPoints,
    isTooLong,
    isTooShort,
    flowSpeed,
    suggestions,
    elisions: elisions.map(e => e.description),
    performanceNotes,
  }
}

function estimateLineFlow(syllables: number): FlowSpeed {
  if (syllables >= FLOW_THRESHOLDS.very_fast.min) return 'very_fast'
  if (syllables >= FLOW_THRESHOLDS.fast.min) return 'fast'
  if (syllables >= FLOW_THRESHOLDS.medium.min) return 'medium'
  return 'slow'
}

function estimateOverallFlow(avgSyllables: number): FlowSpeed {
  return estimateLineFlow(Math.round(avgSyllables))
}

function getFitConfidence(vocalSyllables: number, profile: ModeProfile): LineMetrics['fitConfidence'] {
  if (vocalSyllables >= profile.idealMin && vocalSyllables <= profile.idealMax) return 'alta'
  if (vocalSyllables >= profile.idealMin - profile.tolerance && vocalSyllables <= profile.idealMax + profile.tolerance) return 'provavel'
  return 'depende'
}

function calculateRegularityScore(syllableCounts: number[], mode: MetricsAnalysisMode): number {
  if (syllableCounts.length < 2) return 100
  const mean = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length
  if (mean === 0) return 0

  const variance = syllableCounts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / syllableCounts.length
  const cv = Math.sqrt(variance) / mean
  const toleranceBoost = mode === 'melodic' ? 18 : mode === 'free' ? 25 : 0
  return Math.round(Math.max(0, Math.min(100, 100 - cv * 100 + toleranceBoost)))
}

function buildPerformanceNotes(
  mode: MetricsAnalysisMode,
  written: number,
  vocal: number,
  elisionCount: number,
): string[] {
  const notes: string[] = []
  if (elisionCount > 0) notes.push(`${elisionCount} elisão pode reduzir a entrega para ~${vocal} síl.`)
  if (mode === 'melodic' && written !== vocal) notes.push('Modo melódico considera vogal prolongada e frase cantada.')
  if (mode === 'free') notes.push('Modo livre evita cravar erro sem marcação manual de compasso.')
  return notes
}

function generateLineSuggestions(
  syllableCount: number,
  vocalSyllables: number,
  isTooLong: boolean,
  isTooShort: boolean,
  flowSpeed: FlowSpeed,
  mode: MetricsAnalysisMode,
): string[] {
  const suggestions: string[] = []

  if (isTooLong) {
    const prefix = mode === 'melodic' ? 'Pode caber se houver melodia/pausa' : 'Risco de atropelar o beat'
    suggestions.push(`${prefix}: ${syllableCount} síl. escritas (~${vocalSyllables} cantadas).`)
  }
  if (isTooShort && syllableCount > 0) {
    suggestions.push(`Linha curta (${syllableCount} síl.) — pode funcionar como respiro ou resposta.`)
  }
  if (flowSpeed === 'very_fast' && mode !== 'melodic') {
    suggestions.push('Entrega rápida — confirme se o beat suporta double time.')
  }

  return suggestions
}

function generateWarnings(lines: LineMetrics[], avg: number, profile: ModeProfile): string[] {
  const warnings: string[] = []
  const longLines = lines.filter(l => l.isTooLong).length

  if (longLines > lines.length * 0.4) {
    warnings.push(`Muitas linhas acima do pocket de ${profile.label} — possível atropelamento se cantado reto.`)
  }

  const counts = lines.map(l => l.vocalSyllableEstimate ?? l.syllableCount)
  const maxSyl = Math.max(...counts)
  const minSyl = Math.min(...counts)
  if (maxSyl - minSyl > profile.varianceLimit) {
    warnings.push(`Variação métrica alta para ${profile.label} — pode ser intenção melódica, mas peça marcação de pausas.`)
  }

  if (profile.mode === 'melodic' && avg >= 13) {
    warnings.push('Leitura melódica detectada: valide elisões, sustentação de vogal e entradas antes/depois do tempo.')
  }

  return warnings
}

export function scoreBreathLoad(lines: LineMetrics[], bpm = 90, mode: MetricsAnalysisMode = 'rap'): number {
  if (lines.length === 0) return 0
  const profile = getProfile(mode, bpm)
  const breathThreshold = Math.max(10, Math.round(profile.breathBase / bpm))
  const forced = lines.filter(l => (l.vocalSyllableEstimate ?? l.syllableCount) >= breathThreshold && l.breathPoints.length === 0).length
  return Math.max(0, Math.min(100, Math.round(100 - (forced / lines.length) * 80)))
}

export function scoreBlockConsistency(lines: LineMetrics[]): number {
  if (lines.length < 2) return 100
  const blocks: number[][] = []
  for (let i = 0; i < lines.length; i += 4) {
    const block = lines.slice(i, i + 4).map(l => l.vocalSyllableEstimate ?? l.syllableCount)
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

export function generateLineAlerts(line: LineMetrics, average: number, bpm = 90, mode: MetricsAnalysisMode = 'rap'): string[] {
  const alerts: string[] = []
  const vocal = line.vocalSyllableEstimate ?? line.syllableCount
  const diff = vocal - average

  if (line.syllableCount >= 22 && mode !== 'melodic') {
    alerts.push(`${line.syllableCount} síl. escritas — double time ou divida`)
  } else if (line.isTooLong) {
    alerts.push(mode === 'melodic' ? 'encaixe depende da melodia' : `${vocal} síl. vocais — denso p/ ${bpm} BPM`)
  } else if (diff >= 5) {
    alerts.push(`+${Math.round(diff)} síl. acima da média vocal`)
  }

  if (line.isTooShort) alerts.push('curta: respiro/resposta')

  const breathThreshold = Math.max(10, Math.round(getProfile(mode, bpm).breathBase / bpm))
  if (vocal >= breathThreshold && line.breathPoints.length === 0) {
    alerts.push(mode === 'melodic' ? 'marque pausa ou sustentação' : 'sem respiro — risco de rush')
  }

  if (line.flowSpeed === 'very_fast' && line.syllableCount < 22 && mode !== 'melodic') {
    alerts.push('duplo tempo')
  }

  if (vocal > 0) {
    const msPerSyl = Math.round(480000 / (bpm * vocal))
    if (msPerSyl < 200 && bpm >= 120 && mode !== 'melodic') {
      alerts.push(`${msPerSyl}ms/síl. — entrega exigente`)
    }
  }

  return alerts
}

function emptyMetrics(mode: MetricsAnalysisMode, profile: ModeProfile): MetricsAnalysis {
  return {
    mode,
    modeLabel: profile.label,
    idealRange: { min: profile.idealMin, max: profile.idealMax },
    lines: [],
    averageSyllables: 0,
    regularityScore: 0,
    flowSpeed: 'medium',
    totalLines: 0,
    totalWords: 0,
    totalSyllables: 0,
    warnings: [],
    longestLine: null,
    shortestLine: null,
  }
}
