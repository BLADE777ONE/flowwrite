export type LyricAssistantAction =
  | 'analyze_flow'
  | 'improve_bar'
  | 'internal_rhyme'
  | 'complete_verse'
  | 'explain_rhyme'
  | 'trap_variation'

export interface LyricAssistantRequest {
  action: LyricAssistantAction
  text: string
  bpm: number
  selectedWord?: string
  activeLine?: string
  activeLineIndex?: number
}

export interface CompactLyricContext {
  action: LyricAssistantAction
  bpm: number
  selectedWord: string
  activeLine: string
  activeLineIndex: number
  activeLines: string[]
  fullLineCount: number
  wordCount: number
  estimatedInputTokens: number
  rhymeScheme: string
  averageSyllables: number
  flowSpeed: string
  warnings: string[]
}

export interface LyricAssistantResult {
  source: 'local' | 'ai'
  action: LyricAssistantAction
  text: string
  suggestions: string[]
  tokenEstimate: {
    input: number
    outputLimit: number
    savedByContext: number
  }
}
