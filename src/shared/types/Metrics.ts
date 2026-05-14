// src/shared/types/Metrics.ts

export type FlowSpeed = 'slow' | 'medium' | 'fast' | 'very_fast'
export type MetricsAnalysisMode = 'rap' | 'trap' | 'melodic' | 'free'

export interface StressWord {
  word: string
  position: number
  stress: 'strong' | 'medium' | 'weak'
}

export interface LineMetrics {
  lineIndex: number
  text: string
  syllableCount: number
  vocalSyllableEstimate?: number
  fitConfidence?: 'alta' | 'provavel' | 'depende'
  estimatedStressWords: StressWord[]
  breathPoints: number[]
  isTooLong: boolean
  isTooShort: boolean
  flowSpeed: FlowSpeed
  suggestions: string[]
  elisions: string[]
  performanceNotes?: string[]
}

export interface MetricsAnalysis {
  mode: MetricsAnalysisMode
  modeLabel?: string
  idealRange?: { min: number; max: number }
  lines: LineMetrics[]
  averageSyllables: number
  regularityScore: number
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
  vocabularyEntropy: number
  frequentWords: FrequentWord[]
  saturatedWords: string[]
  recurringThemes: SemanticTheme[]
  dominantVibe: string | null
  averageLineLength: number
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
  clicheDensity: number
  score: number
}

// src/shared/types/Quality.ts
export interface QualityAnalysis {
  rhymeScore: number
  metricsScore: number
  originalityScore: number
  vocabularyScore: number
  flowScore: number
  clichePenalty: number
  overallScore: number
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
