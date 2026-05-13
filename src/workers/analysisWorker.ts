// src/workers/analysisWorker.ts
// Web Worker para análise de texto em background
// Evita travamento da UI durante processamento pesado

import { analyzeRhymes } from '../features/rhyme/RhymeService'
import { analyzeMetrics } from '../features/metrics/MetricsService'
import { analyzeCliches } from '../features/cliches/ClicheService'
import { generateInsights } from '../features/insights/InsightService'
import { analyzeQuality } from '../features/quality/QualityService'
import { calculateVocabularyEntropy, getTopWords } from '../features/artistDNA/vocabularyEntropy'

export interface WorkerInput {
  type: 'analyze'
  content: string
  vibe?: string
  bpm?: number
}

export interface WorkerOutput {
  type: 'result' | 'error' | 'progress'
  rhymeAnalysis?: ReturnType<typeof analyzeRhymes>
  metricsAnalysis?: ReturnType<typeof analyzeMetrics>
  clicheAnalysis?: ReturnType<typeof analyzeCliches>
  qualityAnalysis?: ReturnType<typeof analyzeQuality>
  insights?: ReturnType<typeof generateInsights>
  error?: string
  progress?: number
}

// ─── Handler principal do Worker ─────────────────────────────────────────────
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { type, content, vibe, bpm = 90 } = event.data

  if (type !== 'analyze' || !content?.trim()) {
    self.postMessage({ type: 'result' })
    return
  }

  try {
    // Progresso: 0%
    self.postMessage({ type: 'progress', progress: 0 })

    // 1. Análise de rimas (mais pesada)
    const rhymeAnalysis = analyzeRhymes(content)
    self.postMessage({ type: 'progress', progress: 30 })

    // 2. Análise de métricas
    const metricsAnalysis = analyzeMetrics(content, bpm)
    self.postMessage({ type: 'progress', progress: 55 })

    // 3. Detecção de clichês
    const clicheAnalysis = analyzeCliches(content)
    self.postMessage({ type: 'progress', progress: 70 })

    // 4. Qualidade
    const uniqueWordsRatio = (() => {
      const topWords = getTopWords(content)
      const entropy = calculateVocabularyEntropy(content)
      return entropy
    })()
    const qualityAnalysis = analyzeQuality(rhymeAnalysis, metricsAnalysis, clicheAnalysis, uniqueWordsRatio)
    self.postMessage({ type: 'progress', progress: 85 })

    // 5. Insights
    const insights = generateInsights(content, vibe || 'default')
    self.postMessage({ type: 'progress', progress: 100 })

    // Resultado final
    self.postMessage({
      type: 'result',
      rhymeAnalysis,
      metricsAnalysis,
      clicheAnalysis,
      qualityAnalysis,
      insights
    } as WorkerOutput)

  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Erro na análise'
    } as WorkerOutput)
  }
}
