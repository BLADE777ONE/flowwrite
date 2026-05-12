// src/features/quality/QualityService.ts

import { QualityAnalysis } from '../../shared/types/Metrics'
import { RhymeAnalysis } from '../../shared/types/Rhyme'
import { MetricsAnalysis } from '../../shared/types/Metrics'
import { ClicheAnalysis } from '../../shared/types/Metrics'

/**
 * Gera diagnóstico técnico completo da letra
 */
export function analyzeQuality(
  rhyme: RhymeAnalysis,
  metrics: MetricsAnalysis,
  cliche: ClicheAnalysis,
  uniqueWordsRatio: number  // uniqueWords / totalWords (0-1)
): QualityAnalysis {

  // ─── Rhyme Score (0-100) ──────────────────────────────────────────────────
  // Base: densidade de rimas + qualidade dos tipos
  const rhymeTypeBonus = rhyme.matches.reduce((acc, m) => {
    const bonuses = { multisyllabic: 3, rich: 2, exact: 1.5, approximate: 1, internal: 2, assonance: 0.5, poor: 0, alliteration: 1 }
    return acc + (bonuses[m.type] || 0)
  }, 0)
  const rhymeScore = Math.min(100, Math.round(
    rhyme.rhymeDensity * 50 +
    Math.min(30, rhymeTypeBonus * 2) +
    rhyme.internalRhymes.length * 3 +
    rhyme.multisyllabicMatches.length * 5
  ))

  // ─── Metrics Score (0-100) ──────────────────────────────────────────────
  const longLinePenalty = metrics.lines.filter(l => l.isTooLong).length * 5
  const metricsScore = Math.max(0, Math.min(100, Math.round(
    metrics.regularityScore * 0.6 +
    40 - longLinePenalty
  )))

  // ─── Originality Score (0-100) ─────────────────────────────────────────
  const originalityScore = Math.round(cliche.score)

  // ─── Vocabulary Score (0-100) ──────────────────────────────────────────
  const vocabularyScore = Math.min(100, Math.round(uniqueWordsRatio * 100 * 1.5))

  // ─── Flow Score (0-100) ────────────────────────────────────────────────
  const flowSpeedMap = { slow: 60, medium: 80, fast: 90, very_fast: 70 } // very_fast penaliza levemente
  const baseFlowScore = flowSpeedMap[metrics.flowSpeed] || 70
  const flowConsistencyBonus = metrics.regularityScore > 70 ? 10 : 0
  const flowScore = Math.min(100, baseFlowScore + flowConsistencyBonus - metrics.warnings.length * 5)

  // ─── Cliche Penalty ────────────────────────────────────────────────────
  const clichePenalty = 100 - cliche.score

  // ─── Overall Score (média ponderada) ───────────────────────────────────
  const overallScore = Math.round(
    rhymeScore * 0.30 +
    metricsScore * 0.20 +
    originalityScore * 0.25 +
    vocabularyScore * 0.15 +
    flowScore * 0.10
  )

  const grade = scoreToGrade(overallScore)
  const recommendations = generateRecommendations({
    rhymeScore, metricsScore, originalityScore, vocabularyScore, flowScore,
    clichePenalty, rhyme, metrics, cliche
  })

  return {
    rhymeScore,
    metricsScore,
    originalityScore,
    vocabularyScore,
    flowScore,
    clichePenalty,
    overallScore,
    grade,
    recommendations
  }
}

function scoreToGrade(score: number): QualityAnalysis['grade'] {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function generateRecommendations(data: {
  rhymeScore: number
  metricsScore: number
  originalityScore: number
  vocabularyScore: number
  flowScore: number
  clichePenalty: number
  rhyme: RhymeAnalysis
  metrics: MetricsAnalysis
  cliche: ClicheAnalysis
}): string[] {
  const recs: string[] = []

  if (data.cliche.matches.length > 2) {
    recs.push(`${data.cliche.matches.length} clichês detectados — substitua ao menos os de severidade alta`)
  }

  if (data.rhyme.rhymeDensity < 0.5) {
    recs.push('Menos da metade das linhas rimam — aumente a densidade de rimas')
  }

  if (data.rhyme.internalRhymes.length === 0) {
    recs.push('Nenhuma rima interna — tente rimar dentro de um mesmo verso para aumentar o punch')
  }

  if (data.metrics.lines.filter(l => l.isTooLong).length > 2) {
    recs.push('Muitas linhas longas — divida ou use double time para não perder o flow')
  }

  if (data.vocabularyScore < 50) {
    recs.push('Vocabulário repetitivo — experimente sinônimos e metáforas')
  }

  if (data.rhyme.multisyllabicMatches.length === 0 && data.rhyme.matches.length > 5) {
    recs.push('Sem rimas multissilábicas — tente rimar frases inteiras (ex: "frequência rara" / "presença cara")')
  }

  if (data.metricsScore < 50) {
    recs.push('Alta variação métrica — padronize o número de sílabas por linha para soar mais coeso')
  }

  if (recs.length === 0) {
    recs.push('Letra com boa qualidade técnica — foque em refinar as imagens e o storytelling')
  }

  return recs.slice(0, 5)
}
