// src/shared/types/Metrics.ts

export type FlowSpeed = 'slow' | 'medium' | 'fast' | 'very_fast'

export interface StressWord {
  word: string
  position: number  // índice no verso
  stress: 'strong' | 'medium' | 'weak'
}

export interface LineMetrics {
  lineIndex: number
  text: string
  syllableCount: number
  estimatedStressWords: StressWord[]
  breathPoints: number[]     // índices das palavras onde respirar
  isTooLong: boolean         // > 20 sílabas
  isTooShort: boolean        // < 6 sílabas
  flowSpeed: FlowSpeed
  suggestions: string[]
  elisions: string[]         // descrição das elisões aplicadas
}

export interface MetricsAnalysis {
  lines: LineMetrics[]
  averageSyllables: number
  regularityScore: number    // 0-100 — variação entre linhas
  flowSpeed: FlowSpeed
  totalLines: number
  totalWords: number
  totalSyllables: number
  warnings: string[]
  longestLine: LineMetrics | null
  shortestLine: LineMetrics | null
}

// src/shared/types/ArtistDNA.ts
export interface FrequentWord {
  word: string
  count: number
  percentage: number
}

export interface SemanticTheme {
  theme: string
  weight: number
  keywords: string[]
}

export interface ArtistDNA {
  totalSongs: number
  totalWords: number
  uniqueWords: number
  vocabularyEntropy: number        // 0-1 (Shannon simplificado)
  frequentWords: FrequentWord[]
  saturatedWords: string[]         // palavras com uso excessivo
  recurringThemes: SemanticTheme[]
  dominantVibe: string | null
  averageLineLength: number        // palavras
  averageSyllablesPerLine: number
  rhymeDensity: number
  internalRhymeRate: number
  multisyllableRate: number
  adlibUsageRate: number
  evolutionSuggestions: string[]
  repetitionAlerts: string[]
  updatedAt: Date
}

// src/shared/types/Cliche.ts
export type ClicheSeverity = 'low' | 'medium' | 'high'

export interface ClicheMatch {
  phrase: string
  lineIndex: number
  severity: ClicheSeverity
  suggestion: string
  alternatives: string[]
}

export interface ClicheAnalysis {
  matches: ClicheMatch[]
  totalCliches: number
  clicheDensity: number   // proporção de linhas com clichê
  score: number           // 0-100 (100 = sem clichês)
}

// src/shared/types/Quality.ts
export interface QualityAnalysis {
  rhymeScore: number       // 0-100
  metricsScore: number     // 0-100
  originalityScore: number // 0-100
  vocabularyScore: number  // 0-100
  flowScore: number        // 0-100
  clichePenalty: number    // 0-100 (penalidade)
  overallScore: number     // média ponderada
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  recommendations: string[]
}

// src/shared/types/Insight.ts
export interface InsightResult {
  adlibs: string[]
  onomatopeias: string[]
  wordplayIdeas: string[]
  nextWordSuggestions: string[]
  semanticFields: string[]
  vibeVariations: string[]
  lastLineSuggestions: string[]
}
